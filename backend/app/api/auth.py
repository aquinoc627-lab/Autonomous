"""
Autonomous — Authentication API

Endpoints:
  POST /api/auth/register  — create a new user (admin only)
  POST /api/auth/login     — authenticate and receive token pair
  POST /api/auth/refresh   — exchange refresh token for new token pair
  POST /api/auth/logout    — revoke the current refresh token
  GET  /api/auth/me        — return the current user profile
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    hash_password,
    hash_token,
    require_admin,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.schemas import (
    LoginRequest,
    TokenPair,
    TokenRefresh,
    UserCreate,
    UserRead,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    body: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Register a new user.  Requires admin privileges."""
    # Check for existing username or email
    existing = await db.execute(
        select(User).where(
            (User.username == body.username) | (User.email == body.email)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already exists",
        )

    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=body.role.value,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    await record_audit(
        db,
        user_id=_admin.id,
        action="register_user",
        entity_type="user",
        entity_id=user.id,
        details={"username": user.username, "role": user.role},
        request=request,
    )

    return user


@router.post("/login", response_model=TokenPair)
async def login(
    body: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate with username and password, receive a JWT token pair."""
    result = await db.execute(
        select(User).where(User.username == body.username)
    )
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.hashed_password):
        # Audit failed login attempt
        await record_audit(
            db,
            user_id=None,
            action="login_failed",
            entity_type="auth",
            details={"username": body.username},
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    access = create_access_token(user.id, user.role)
    raw_refresh, refresh_hash, expires_at = create_refresh_token()

    db.add(RefreshToken(
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=expires_at,
    ))
    await db.flush()

    # Audit successful login
    await record_audit(
        db,
        user_id=user.id,
        action="login",
        entity_type="auth",
        details={"username": user.username},
        request=request,
    )

    return TokenPair(access_token=access, refresh_token=raw_refresh)


@router.post("/refresh", response_model=TokenPair)
async def refresh(
    body: TokenRefresh,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Exchange a valid refresh token for a new token pair (rotation)."""
    token_hash = hash_token(body.refresh_token)

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False,  # noqa: E712
        )
    )
    stored = result.scalar_one_or_none()

    if stored is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    from datetime import datetime, timezone
    if stored.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        stored.revoked = True
        await db.flush()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired",
        )

    # Revoke the old token (rotation)
    stored.revoked = True

    # Load the user
    user_result = await db.execute(
        select(User).where(User.id == stored.user_id)
    )
    user = user_result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Issue new pair
    access = create_access_token(user.id, user.role)
    raw_refresh, refresh_hash, expires_at = create_refresh_token()

    db.add(RefreshToken(
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=expires_at,
    ))
    await db.flush()

    await record_audit(
        db,
        user_id=user.id,
        action="token_refresh",
        entity_type="auth",
        request=request,
    )

    return TokenPair(access_token=access, refresh_token=raw_refresh)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    body: TokenRefresh,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Revoke a refresh token (logout)."""
    token_hash = hash_token(body.refresh_token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    stored = result.scalar_one_or_none()
    if stored:
        stored.revoked = True
        await db.flush()

    await record_audit(
        db,
        user_id=_user.id,
        action="logout",
        entity_type="auth",
        request=request,
    )


@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)):
    """Return the profile of the currently authenticated user."""
    return current_user
