"""
Autonomous — Agents API

Endpoints:
  GET    /api/agents          — list all agents (filterable by status)
  POST   /api/agents          — create a new agent
  GET    /api/agents/{id}     — get agent by ID
  PATCH  /api/agents/{id}     — update an agent
  DELETE /api/agents/{id}     — delete an agent (admin only)
  GET    /api/agents/{id}/missions — list missions assigned to an agent
  POST   /api/agents/{id}/think    — trigger agent brain manually
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
from app.core.brain import AgentBrain
from app.models.agent import Agent
from app.models.agent_mission import AgentMission
from app.models.mission import Mission
from app.models.user import User
from app.schemas.schemas import (
    AgentCreate,
    AgentRead,
    AgentStatus,
    AgentUpdate,
    MissionRead,
)

router = APIRouter(prefix="/api/agents", tags=["Agents"])


@router.get("", response_model=list[AgentRead])
async def list_agents(
    status_filter: Optional[AgentStatus] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List all agents, optionally filtered by status."""
    stmt = select(Agent).order_by(Agent.created_at.desc())
    if status_filter:
        stmt = stmt.where(Agent.status == status_filter.value)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=AgentRead, status_code=status.HTTP_201_CREATED)
async def create_agent(
    body: AgentCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new agent."""
    # Check for duplicate name
    existing = await db.execute(
        select(Agent).where(Agent.name == body.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Agent name already exists",
        )

    agent = Agent(
        name=body.name,
        description=body.description,
        status=body.status.value,
        persona=body.persona,
        created_by=current_user.id,
    )
    db.add(agent)
    await db.flush()
    await db.refresh(agent)

    # Audit log
    await record_audit(
        db,
        user_id=current_user.id,
        action="create",
        entity_type="agent",
        entity_id=agent.id,
        details={"name": agent.name, "status": agent.status},
        request=request,
    )

    # Broadcast real-time update
    await manager.broadcast({
        "event": "agent_created",
        "data": AgentRead.model_validate(agent).model_dump(mode="json"),
    })

    return agent


@router.get("/{agent_id}", response_model=AgentRead)
async def get_agent(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get a single agent by ID."""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.patch("/{agent_id}", response_model=AgentRead)
async def update_agent(
    agent_id: str,
    body: AgentUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing agent."""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Capture before-state for audit
    before = {"name": agent.name, "status": agent.status, "description": agent.description, "persona": agent.persona}

    update_data = body.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] is not None:
        update_data["status"] = update_data["status"].value

    for field, value in update_data.items():
        setattr(agent, field, value)

    await db.flush()
    await db.refresh(agent)

    # Audit log
    after = {"name": agent.name, "status": agent.status, "description": agent.description, "persona": agent.persona}
    await record_audit(
        db,
        user_id=current_user.id,
        action="update",
        entity_type="agent",
        entity_id=agent.id,
        details={"before": before, "after": after},
        request=request,
    )

    await manager.broadcast({
        "event": "agent_updated",
        "data": AgentRead.model_validate(agent).model_dump(mode="json"),
    })

    return agent


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    agent_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Delete an agent.  Requires admin privileges."""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent_name = agent.name
    await db.delete(agent)
    await db.flush()

    # Audit log
    await record_audit(
        db,
        user_id=admin.id,
        action="delete",
        entity_type="agent",
        entity_id=agent_id,
        details={"name": agent_name},
        request=request,
    )

    await manager.broadcast({
        "event": "agent_deleted",
        "data": {"id": agent_id},
    })


@router.get("/{agent_id}/missions", response_model=list[MissionRead])
async def get_agent_missions(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List all missions assigned to a specific agent."""
    result = await db.execute(
        select(Mission)
        .join(AgentMission, AgentMission.mission_id == Mission.id)
        .where(AgentMission.agent_id == agent_id)
        .order_by(Mission.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{agent_id}/think")
async def trigger_agent_think(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Manually trigger an agent's brain to reason and act."""
    action = await AgentBrain.think(db, agent_id)
    if action:
        await AgentBrain.execute_action(db, agent_id, action)
        return {"status": "success", "action": action}
    return {"status": "no_action"}
