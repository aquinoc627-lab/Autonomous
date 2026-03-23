"""
Autonomous — Banter API

Endpoints:
  GET    /api/banter       — list banter messages (filterable by mission, agent, sender, type)
  POST   /api/banter       — create a new banter message
  GET    /api/banter/{id}  — get a single banter message
  DELETE /api/banter/{id}  — delete a banter message (admin only)
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.core.websocket_manager import manager
from app.models.banter import Banter
from app.models.user import User
from app.schemas.schemas import (
    BanterCreate,
    BanterMessageType,
    BanterRead,
)

router = APIRouter(prefix="/api/banter", tags=["Banter"])


@router.get("", response_model=list[BanterRead])
async def list_banter(
    mission_id: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    sender_id: Optional[str] = Query(None),
    message_type: Optional[BanterMessageType] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """
    List banter messages with optional filters.

    Supports filtering by mission, agent, sender, and message type.
    Results are ordered newest-first with pagination.
    """
    stmt = select(Banter).order_by(Banter.created_at.desc())

    if mission_id:
        stmt = stmt.where(Banter.mission_id == mission_id)
    if agent_id:
        stmt = stmt.where(Banter.agent_id == agent_id)
    if sender_id:
        stmt = stmt.where(Banter.sender_id == sender_id)
    if message_type:
        stmt = stmt.where(Banter.message_type == message_type.value)

    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=BanterRead, status_code=status.HTTP_201_CREATED)
async def create_banter(
    body: BanterCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new banter message and broadcast it via WebSocket."""
    banter = Banter(
        message=body.message,
        message_type=body.message_type.value,
        sender_id=current_user.id,
        mission_id=body.mission_id,
        agent_id=body.agent_id,
    )
    db.add(banter)
    await db.flush()
    await db.refresh(banter)

    # Audit log
    await record_audit(
        db,
        user_id=current_user.id,
        action="create",
        entity_type="banter",
        entity_id=banter.id,
        details={"message_type": banter.message_type, "mission_id": body.mission_id, "agent_id": body.agent_id},
        request=request,
    )

    banter_data = BanterRead.model_validate(banter).model_dump(mode="json")

    # Broadcast to all clients
    await manager.broadcast({
        "event": "banter_created",
        "data": banter_data,
    })

    # Also broadcast to specific channels if applicable
    if body.mission_id:
        await manager.broadcast_to_channel(
            f"mission:{body.mission_id}",
            {"event": "banter_created", "data": banter_data},
        )
    if body.agent_id:
        await manager.broadcast_to_channel(
            f"agent:{body.agent_id}",
            {"event": "banter_created", "data": banter_data},
        )

    return banter


@router.get("/{banter_id}", response_model=BanterRead)
async def get_banter(
    banter_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get a single banter message by ID."""
    result = await db.execute(select(Banter).where(Banter.id == banter_id))
    banter = result.scalar_one_or_none()
    if banter is None:
        raise HTTPException(status_code=404, detail="Banter message not found")
    return banter


@router.delete("/{banter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_banter(
    banter_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Delete a banter message.  Requires admin privileges."""
    result = await db.execute(select(Banter).where(Banter.id == banter_id))
    banter = result.scalar_one_or_none()
    if banter is None:
        raise HTTPException(status_code=404, detail="Banter message not found")

    await db.delete(banter)
    await db.flush()

    # Audit log
    await record_audit(
        db,
        user_id=admin.id,
        action="delete",
        entity_type="banter",
        entity_id=banter_id,
        details={"message": banter.message[:100]},
        request=request,
    )

    await manager.broadcast({
        "event": "banter_deleted",
        "data": {"id": banter_id},
    })
