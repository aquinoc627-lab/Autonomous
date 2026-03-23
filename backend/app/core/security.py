"""
Autonomous — Security Utilities

Provides JWT token creation/verification, password hashing, and
FastAPI dependencies for authentication and role-based access control.

Authentication mode:
  - AUTH_MODE=jwt  (default) — local JWT with bcrypt passwords
  - AUTH_MODE=oauth          — external OAuth provider (Auth0, Okta, etc.)

The ``get_current_user`` dependency automatically delegates to the correct
backend based on AUTH_MODE, so route handlers need no changes when switching.

Security design:
  - Access tokens are short-lived (configurable, default 30 min).
  - Refresh tokens are long-lived, stored as SHA-256 hashes in the DB.
  - Passwords are hashed with bcrypt via passlib.
  - All token operations validate expiry, signature, and structure.
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, WebSocket, status
from fastapi.security import OAuth2PasswordBearer
from passlib.hash import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    AUTH_MODE,
    JWT_ALGORITHM,
    REFRESH_TOKEN_EXPIRE_DAYS,
    SECRET_KEY,
)
from app.core.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ======================================================================
# Password hashing
# ======================================================================

def hash_password(plain: str) -> str:
    """Return a bcrypt hash of the plaintext password."""
    return bcrypt.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.verify(plain, hashed)


# ======================================================================
# JWT token creation
# ======================================================================

def create_access_token(
    user_id: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a signed JWT access token."""
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {
        "sub": user_id,
        "role": role,
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_refresh_token() -> tuple[str, str, datetime]:
    """
    Create a refresh token.

    Returns:
        (raw_token, token_hash, expires_at)

    The raw token is sent to the client; only the hash is stored in the DB.
    """
    raw = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return raw, token_hash, expires_at


def hash_token(raw: str) -> str:
    """Hash a raw token string with SHA-256."""
    return hashlib.sha256(raw.encode()).hexdigest()


# ======================================================================
# JWT token verification
# ======================================================================

def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT access token.

    Raises HTTPException 401 on any failure.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


# ======================================================================
# FastAPI dependencies — unified interface for JWT and OAuth
# ======================================================================

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    """
    Dependency that extracts and validates the current user from the
    Authorization header.  Returns the User ORM object.

    Automatically delegates to OAuth validation when AUTH_MODE=oauth.
    """
    if AUTH_MODE == "oauth":
        from app.core.oauth import get_oauth_user
        return await get_oauth_user(token=token, db=db)

    # Default: local JWT mode
    from app.models.user import User  # local import to avoid circular deps

    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


async def require_admin(
    current_user=Depends(get_current_user),
):
    """Dependency that ensures the current user has the admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


async def get_ws_user(
    websocket: WebSocket,
    db: AsyncSession,
):
    """
    Authenticate a WebSocket connection using a token query parameter.

    Usage:
        ws://host/ws?token=<jwt_access_token>

    Automatically delegates to OAuth validation when AUTH_MODE=oauth.
    """
    if AUTH_MODE == "oauth":
        from app.core.oauth import get_oauth_ws_user
        return await get_oauth_ws_user(websocket, db)

    # Default: local JWT mode
    from app.models.user import User

    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return None

    try:
        payload = decode_access_token(token)
    except HTTPException:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return None

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        await websocket.close(code=4001, reason="User not found or inactive")
        return None

    return user
