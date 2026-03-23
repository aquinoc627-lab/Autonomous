"""
Autonomous — Missions API

Endpoints:
  GET    /api/missions              — list all missions (filterable)
  POST   /api/missions              — create a new mission
  GET    /api/missions/{id}         — get mission by ID
  PATCH  /api/missions/{id}         — update a mission
  DELETE /api/missions/{id}         — delete a mission (admin only)
  GET    /api/missions/{id}/agents  — list agents assigned to a mission
  POST   /api/missions/{id}/assign  — assign an agent to a mission
  DELETE /api/missions/{id}/assign/{agent_id} — revoke agent from mission
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.core.websocket_manager import manager
from app.models.agent import Agent
from app.models.agent_mission import AgentMission
from app.models.mission import Mission
from app.models.user import User
from app.schemas.schemas import (
    AgentMissionCreate,
    AgentMissionRead,
    AgentRead,
    MissionCreate,
    MissionPriority,
    MissionRead,
    MissionStatus,
    MissionUpdate,
)

router = APIRouter(prefix="/api/missions", tags=["Missions"])


@router.get("", response_model=list[MissionRead])
async def list_missions(
    status_filter: Optional[MissionStatus] = Query(None, alias="status"),
    priority: Optional[MissionPriority] = Query(None),
    parent_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List all missions, optionally filtered by status, priority, and parent_id."""
    stmt = select(Mission).options(selectinload(Mission.sub_tasks)).order_by(Mission.created_at.desc())
    if status_filter:
        stmt = stmt.where(Mission.status == status_filter.value)
    if priority:
        stmt = stmt.where(Mission.priority == priority.value)
    if parent_id:
        stmt = stmt.where(Mission.parent_id == parent_id)
    else:
        # By default, only show top-level missions
        stmt = stmt.where(Mission.parent_id == None)
        
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=MissionRead, status_code=status.HTTP_201_CREATED)
async def create_mission(
    body: MissionCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new mission."""
    mission = Mission(
        name=body.name,
        description=body.description,
        status=body.status.value,
        priority=body.priority.value,
        created_by=current_user.id,
        parent_id=body.parent_id,
    )
    db.add(mission)
    await db.flush()
    await db.refresh(mission)

    await record_audit(
        db,
        user_id=current_user.id,
        action="create",
        entity_type="mission",
        entity_id=mission.id,
        details={"name": mission.name, "status": mission.status, "priority": mission.priority, "parent_id": mission.parent_id},
        request=request,
    )

    await manager.broadcast({
        "event": "mission_created",
        "data": MissionRead.model_validate(mission).model_dump(mode="json"),
    })

    return mission


@router.get("/{mission_id}", response_model=MissionRead)
async def get_mission(
    mission_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get a single mission by ID."""
    result = await db.execute(select(Mission).options(selectinload(Mission.sub_tasks)).where(Mission.id == mission_id))
    mission = result.scalar_one_or_none()
    if mission is None:
        raise HTTPException(status_code=404, detail="Mission not found")
    return mission


@router.patch("/{mission_id}", response_model=MissionRead)
async def update_mission(
    mission_id: str,
    body: MissionUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing mission."""
    result = await db.execute(select(Mission).options(selectinload(Mission.sub_tasks)).where(Mission.id == mission_id))
    mission = result.scalar_one_or_none()
    if mission is None:
        raise HTTPException(status_code=404, detail="Mission not found")

    # Capture before-state for audit
    before = {
        "name": mission.name,
        "status": mission.status,
        "priority": mission.priority,
        "description": mission.description,
        "parent_id": mission.parent_id,
    }

    update_data = body.model_dump(exclude_unset=True)

    # Handle enum values
    if "status" in update_data and update_data["status"] is not None:
        new_status = update_data["status"].value
        # Auto-set timestamps on status transitions
        if new_status == "in_progress" and mission.started_at is None:
            mission.started_at = datetime.now(timezone.utc)
        elif new_status in ("completed", "failed", "cancelled"):
            mission.completed_at = datetime.now(timezone.utc)
        update_data["status"] = new_status

    if "priority" in update_data and update_data["priority"] is not None:
        update_data["priority"] = update_data["priority"].value

    for field, value in update_data.items():
        setattr(mission, field, value)

    await db.flush()
    await db.refresh(mission)

    after = {
        "name": mission.name,
        "status": mission.status,
        "priority": mission.priority,
        "description": mission.description,
        "parent_id": mission.parent_id,
    }
    await record_audit(
        db,
        user_id=current_user.id,
        action="update",
        entity_type="mission",
        entity_id=mission.id,
        details={"before": before, "after": after},
        request=request,
    )

    await manager.broadcast({
        "event": "mission_updated",
        "data": MissionRead.model_validate(mission).model_dump(mode="json"),
    })

    return mission


@router.delete("/{mission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mission(
    mission_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Delete a mission.  Requires admin privileges."""
    result = await db.execute(select(Mission).where(Mission.id == mission_id))
    mission = result.scalar_one_or_none()
    if mission is None:
        raise HTTPException(status_code=404, detail="Mission not found")

    mission_name = mission.name
    await db.delete(mission)
    await db.flush()

    await record_audit(
        db,
        user_id=admin.id,
        action="delete",
        entity_type="mission",
        entity_id=mission_id,
        details={"name": mission_name},
        request=request,
    )

    await manager.broadcast({
        "event": "mission_deleted",
        "data": {"id": mission_id},
    })


# ------------------------------------------------------------------
# Agent assignment endpoints
# ------------------------------------------------------------------

@router.get("/{mission_id}/agents", response_model=list[AgentRead])
async def get_mission_agents(
    mission_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List all agents assigned to a specific mission."""
    result = await db.execute(
        select(Agent)
        .join(AgentMission, AgentMission.agent_id == Agent.id)
        .where(AgentMission.mission_id == mission_id)
        .order_by(Agent.name)
    )
    return result.scalars().all()


@router.post("/{mission_id}/assign", response_model=AgentMissionRead, status_code=status.HTTP_201_CREATED)
async def assign_agent(
    mission_id: str,
    body: AgentMissionCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assign an agent to a mission."""
    # Verify mission exists
    mission = await db.execute(select(Mission).where(Mission.id == mission_id))
    if mission.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Mission not found")

    # Verify agent exists
    agent = await db.execute(select(Agent).where(Agent.id == body.agent_id))
    if agent.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Check for duplicate assignment
    existing = await db.execute(
        select(AgentMission).where(
            AgentMission.agent_id == body.agent_id,
            AgentMission.mission_id == mission_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Agent is already assigned to this mission",
        )

    assignment = AgentMission(
        agent_id=body.agent_id,
        mission_id=mission_id,
        assigned_by=current_user.id,
    )
    db.add(assignment)
    await db.flush()
    await db.refresh(assignment)

    await record_audit(
        db,
        user_id=current_user.id,
        action="assign",
        entity_type="agent_mission",
        entity_id=str(assignment.id),
        details={"agent_id": body.agent_id, "mission_id": mission_id},
        request=request,
    )

    await manager.broadcast({
        "event": "agent_assigned",
        "data": AgentMissionRead.model_validate(assignment).model_dump(mode="json"),
    })

    return assignment


@router.delete("/{mission_id}/assign/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_agent(
    mission_id: str,
    agent_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke an agent's assignment from a mission."""
    result = await db.execute(
        select(AgentMission).where(
            AgentMission.agent_id == agent_id,
            AgentMission.mission_id == mission_id,
        )
    )
    assignment = result.scalar_one_or_none()
    if assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found")

    await db.delete(assignment)
    await db.flush()

    await record_audit(
        db,
        user_id=current_user.id,
        action="revoke",
        entity_type="agent_mission",
        details={"agent_id": agent_id, "mission_id": mission_id},
        request=request,
    )

    await manager.broadcast({
        "event": "agent_revoked",
        "data": {"agent_id": agent_id, "mission_id": mission_id},
    })
