from __future__ import annotations

import secrets
import hashlib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.audit import record_audit
from app.models.user import User
from app.models.api_key import ApiKey
from pydantic import BaseModel, Field

router = APIRouter()


class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=64)


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    created_at: str
    is_active: bool
    # raw_key is only returned ONCE upon creation
    raw_key: Optional[str] = None


@router.post("/", response_model=ApiKeyResponse, status_code=201)
async def create_api_key(
    data: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a new API key for CI/CD integrations."""
    if current_user.tier not in ["commander", "nexus_prime"]:
        raise HTTPException(status_code=403, detail="Headless API Access requires Commander or Nexus Prime clearance.")

    raw_key = f"nx_live_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:12]

    api_key = ApiKey(
        user_id=current_user.id,
        name=data.name,
        key_hash=key_hash,
        key_prefix=key_prefix,
        is_active=True
    )

    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    await record_audit(
        db, user_id=current_user.id, action="create_api_key",
        entity_type="api_key", entity_id=api_key.id,
        ip_address="0.0.0.0"
    )

    return ApiKeyResponse(
        id=api_key.id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        created_at=api_key.created_at.isoformat(),
        is_active=api_key.is_active,
        raw_key=raw_key
    )


@router.get("/", response_model=List[ApiKeyResponse])
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all active and inactive API keys."""
    res = await db.execute(select(ApiKey).where(ApiKey.user_id == current_user.id).order_by(ApiKey.created_at.desc()))
    keys = res.scalars().all()
    return [
        ApiKeyResponse(
            id=k.id, name=k.name, key_prefix=k.key_prefix,
            created_at=k.created_at.isoformat(), is_active=k.is_active
        )
        for k in keys
    ]


@router.delete("/{key_id}", status_code=204)
async def revoke_api_key(
    key_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Revoke an API Key permanently."""
    res = await db.execute(select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == current_user.id))
    k = res.scalar_one_or_none()
    if not k:
        raise HTTPException(status_code=404, detail="Key not found")

    k.is_active = False
    await db.commit()
    await record_audit(
        db, user_id=current_user.id, action="revoke_api_key",
        entity_type="api_key", entity_id=k.id, ip_address="0.0.0.0"
    )
    return None
