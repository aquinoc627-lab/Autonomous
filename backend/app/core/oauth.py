"""
Autonomous — OAuth Authentication Module

Provides an alternative authentication backend using external OAuth providers
(Auth0, Okta, or any OIDC-compliant provider).  When AUTH_MODE=oauth, this
module replaces the local JWT verification with remote JWKS-based token
validation.

Architecture:
  - Fetches the provider's JWKS (JSON Web Key Set) and caches it.
  - Validates incoming Bearer tokens against the provider's public keys.
  - Extracts user identity and roles from the token claims.
  - Maps external users to local User records (auto-provisioning on first login).

Swap mechanism:
  The ``get_current_user`` dependency in ``security.py`` delegates to this
  module when ``AUTH_MODE == "oauth"``.  No other code changes are needed.

Supported providers:
  - Auth0:  Set OAUTH_DOMAIN to your Auth0 tenant domain.
  - Okta:   Set OAUTH_DOMAIN to your Okta org domain.
  - Any OIDC provider that exposes a ``/.well-known/jwks.json`` endpoint.

Usage:
  Set the following environment variables:
    AUTH_MODE=oauth
    OAUTH_DOMAIN=your-tenant.auth0.com
    OAUTH_CLIENT_ID=your-client-id
    OAUTH_AUDIENCE=https://api.autonomous.local
"""

from __future__ import annotations

import logging
import time
from typing import Any, Optional

import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, WebSocket, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import (
    OAUTH_ALGORITHMS,
    OAUTH_AUDIENCE,
    OAUTH_DOMAIN,
    OAUTH_ISSUER,
)
from app.core.database import get_db

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# ---------------------------------------------------------------------------
# JWKS client (cached, thread-safe)
# ---------------------------------------------------------------------------
_jwks_client: Optional[PyJWKClient] = None
_jwks_cache_ttl: int = 3600  # Re-fetch JWKS every hour
_jwks_last_fetch: float = 0.0


def _get_jwks_client() -> PyJWKClient:
    """Return a cached PyJWKClient for the configured OAuth domain."""
    global _jwks_client, _jwks_last_fetch

    now = time.time()
    if _jwks_client is None or (now - _jwks_last_fetch) > _jwks_cache_ttl:
        jwks_url = f"https://{OAUTH_DOMAIN}/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url)
        _jwks_last_fetch = now
        logger.info("JWKS client initialised from %s", jwks_url)

    return _jwks_client


# ---------------------------------------------------------------------------
# Token verification
# ---------------------------------------------------------------------------

def decode_oauth_token(token: str) -> dict[str, Any]:
    """
    Decode and validate an OAuth Bearer token using the provider's JWKS.

    Raises HTTPException 401 on any validation failure.
    """
    if not OAUTH_DOMAIN:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OAuth is enabled but OAUTH_DOMAIN is not configured",
        )

    try:
        client = _get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=OAUTH_ALGORITHMS,
            audience=OAUTH_AUDIENCE or None,
            issuer=OAUTH_ISSUER or None,
        )
        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="OAuth token has expired",
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience",
        )
    except jwt.InvalidIssuerError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token issuer",
        )
    except jwt.InvalidTokenError as e:
        logger.warning("OAuth token validation failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OAuth token",
        )
    except Exception as e:
        logger.error("Unexpected error during OAuth token validation: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token validation error",
        )


def _extract_role(payload: dict[str, Any]) -> str:
    """
    Extract the user role from OAuth token claims.

    Supports common claim patterns:
      - Auth0 custom namespace: ``https://autonomous.local/role``
      - Auth0 roles array: ``https://autonomous.local/roles``
      - Okta groups claim: ``groups``
      - Standard ``role`` claim
    """
    # Direct role claim
    role = payload.get("role")
    if role:
        return role if role in ("admin", "operator") else "operator"

    # Auth0 namespace pattern
    for key in payload:
        if key.endswith("/role"):
            return payload[key] if payload[key] in ("admin", "operator") else "operator"
        if key.endswith("/roles"):
            roles = payload[key]
            if isinstance(roles, list) and "admin" in roles:
                return "admin"
            return "operator"

    # Okta groups
    groups = payload.get("groups", [])
    if isinstance(groups, list) and "admin" in groups:
        return "admin"

    return "operator"


# ---------------------------------------------------------------------------
# FastAPI dependency — OAuth variant of get_current_user
# ---------------------------------------------------------------------------

async def get_oauth_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    """
    Dependency that validates an OAuth token and returns or creates a local
    User record.

    On first login, a local user is auto-provisioned with the identity from
    the OAuth token (sub claim as username, email from token or generated).
    """
    from app.models.user import User

    payload = decode_oauth_token(token)

    # Extract identity
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing 'sub' claim",
        )

    email = payload.get("email", f"{sub}@oauth.local")
    name = payload.get("name") or payload.get("nickname") or sub
    role = _extract_role(payload)

    # Look up or auto-provision local user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        # Auto-provision on first OAuth login
        user = User(
            username=name[:64],
            email=email[:320],
            hashed_password="OAUTH_MANAGED",  # No local password
            role=role,
            is_active=True,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        logger.info("Auto-provisioned OAuth user: %s (%s)", user.username, user.email)
    else:
        # Update role if it changed in the provider
        if user.role != role:
            user.role = role
            await db.flush()

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    return user


async def get_oauth_ws_user(
    websocket: WebSocket,
    db: AsyncSession,
):
    """Authenticate a WebSocket connection using an OAuth token query parameter."""
    from app.models.user import User

    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return None

    try:
        payload = decode_oauth_token(token)
    except HTTPException:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return None

    sub = payload.get("sub")
    email = payload.get("email", f"{sub}@oauth.local")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        await websocket.close(code=4001, reason="User not found or inactive")
        return None

    return user
