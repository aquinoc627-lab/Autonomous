"""
Autonomous — Analytics API

Endpoints:
  GET /api/analytics/overview    — high-level counts and status breakdown
  GET /api/analytics/activity    — mission/agent activity over time
  GET /api/analytics/health      — system health metrics
  GET /api/analytics/memory      — semantic memory search
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.websocket_manager import manager
from app.core.memory import memory_palace
from app.models.agent import Agent
from app.models.agent_mission import AgentMission
from app.models.audit_log import AuditLog
from app.models.banter import Banter
from app.models.mission import Mission
from app.models.user import User

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/overview")
async def overview(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """
    High-level platform overview with counts and status breakdowns.

    Returns total counts for agents, missions, banter, and users, plus
    status distributions for agents and missions.
    """
    # Total counts
    agent_count = (await db.execute(select(func.count()).select_from(Agent))).scalar()
    mission_count = (await db.execute(select(func.count()).select_from(Mission))).scalar()
    banter_count = (await db.execute(select(func.count()).select_from(Banter))).scalar()
    user_count = (await db.execute(select(func.count()).select_from(User))).scalar()
    assignment_count = (await db.execute(select(func.count()).select_from(AgentMission))).scalar()

    # Agent status breakdown
    agent_status_result = await db.execute(
        select(Agent.status, func.count()).group_by(Agent.status)
    )
    agent_statuses = {row[0]: row[1] for row in agent_status_result.all()}

    # Mission status breakdown
    mission_status_result = await db.execute(
        select(Mission.status, func.count()).group_by(Mission.status)
    )
    mission_statuses = {row[0]: row[1] for row in mission_status_result.all()}

    # Mission priority breakdown
    mission_priority_result = await db.execute(
        select(Mission.priority, func.count()).group_by(Mission.priority)
    )
    mission_priorities = {row[0]: row[1] for row in mission_priority_result.all()}

    return {
        "totals": {
            "agents": agent_count,
            "missions": mission_count,
            "banter": banter_count,
            "users": user_count,
            "assignments": assignment_count,
        },
        "agent_statuses": agent_statuses,
        "mission_statuses": mission_statuses,
        "mission_priorities": mission_priorities,
        "websocket_connections": manager.active_count,
    }


@router.get("/activity")
async def activity(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """
    Activity timeline for the last 7 days.

    Returns daily counts of new missions, new banter messages, and
    new agent assignments.
    """
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)

    # Build daily activity data
    days = []
    for i in range(7):
        day_start = (now - timedelta(days=6 - i)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        day_end = day_start + timedelta(days=1)

        missions_created = (await db.execute(
            select(func.count()).select_from(Mission).where(
                Mission.created_at >= day_start,
                Mission.created_at < day_end,
            )
        )).scalar()

        banter_created = (await db.execute(
            select(func.count()).select_from(Banter).where(
                Banter.created_at >= day_start,
                Banter.created_at < day_end,
            )
        )).scalar()

        assignments_created = (await db.execute(
            select(func.count()).select_from(AgentMission).where(
                AgentMission.assigned_at >= day_start,
                AgentMission.assigned_at < day_end,
            )
        )).scalar()

        days.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "missions": missions_created,
            "banter": banter_created,
            "assignments": assignments_created,
        })

    # Banter by message type
    banter_types_result = await db.execute(
        select(Banter.message_type, func.count())
        .where(Banter.created_at >= seven_days_ago)
        .group_by(Banter.message_type)
    )
    banter_types = {row[0]: row[1] for row in banter_types_result.all()}

    return {
        "daily_activity": days,
        "banter_by_type": banter_types,
    }


@router.get("/health")
async def health(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """
    System health metrics.

    Returns operational metrics including agent availability,
    mission completion rates, and real-time connection count.
    """
    # Agent availability
    total_agents = (await db.execute(select(func.count()).select_from(Agent))).scalar() or 1
    active_agents = (await db.execute(
        select(func.count()).select_from(Agent).where(Agent.status.in_(["active", "idle"]))
    )).scalar()
    error_agents = (await db.execute(
        select(func.count()).select_from(Agent).where(Agent.status == "error")
    )).scalar()
    offline_agents = (await db.execute(
        select(func.count()).select_from(Agent).where(Agent.status == "offline")
    )).scalar()

    # Mission completion rate
    total_missions = (await db.execute(select(func.count()).select_from(Mission))).scalar() or 1
    completed_missions = (await db.execute(
        select(func.count()).select_from(Mission).where(Mission.status == "completed")
    )).scalar()
    failed_missions = (await db.execute(
        select(func.count()).select_from(Mission).where(Mission.status == "failed")
    )).scalar()

    return {
        "agent_availability": round(active_agents / total_agents * 100, 1),
        "agent_breakdown": {
            "active": active_agents - (await db.execute(
                select(func.count()).select_from(Agent).where(Agent.status == "idle")
            )).scalar(),
            "idle": (await db.execute(
                select(func.count()).select_from(Agent).where(Agent.status == "idle")
            )).scalar(),
            "error": error_agents,
            "offline": offline_agents,
        },
        "mission_completion_rate": round(completed_missions / total_missions * 100, 1),
        "mission_breakdown": {
            "completed": completed_missions,
            "failed": failed_missions,
            "in_progress": (await db.execute(
                select(func.count()).select_from(Mission).where(Mission.status == "in_progress")
            )).scalar(),
            "pending": (await db.execute(
                select(func.count()).select_from(Mission).where(Mission.status == "pending")
            )).scalar(),
        },
        "websocket_connections": manager.active_count,
        "status": "operational",
        "online_users": manager.get_online_users(),
    }


@router.get("/presence")
async def presence(
    _user: User = Depends(get_current_user),
):
    """
    Return the list of currently online users and connection count.
    """
    return {
        "online_users": manager.get_online_users(),
        "online_count": manager.active_count,
    }


@router.get("/audit")
async def audit_log(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_user),
    limit: int = 50,
    offset: int = 0,
):
    """
    Return recent audit log entries.  Available to all authenticated users
    but sensitive details are only shown to admins.
    """
    stmt = (
        select(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(min(limit, 200))
        .offset(offset)
    )
    result = await db.execute(stmt)
    entries = result.scalars().all()

    return [
        {
            "id": e.id,
            "user_id": e.user_id,
            "action": e.action,
            "entity_type": e.entity_type,
            "entity_id": e.entity_id,
            "details": e.details if _admin.role == "admin" else None,
            "ip_address": e.ip_address if _admin.role == "admin" else None,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in entries
    ]


@router.get("/memory")
async def memory_search(
    query: str = Query(..., min_length=1),
    _user: User = Depends(get_current_user),
):
    """
    Perform a semantic search across the Memory Palace.
    """
    # Search across all collections
    missions = await memory_palace.recall_memories("missions", query, n_results=3)
    banter = await memory_palace.recall_memories("banter", query, n_results=3)
    code = await memory_palace.recall_memories("code", query, n_results=3)

    # Combine and label
    all_memories = []
    for m in missions:
        m["metadata"]["collection"] = "Mission"
        all_memories.append(m)
    for b in banter:
        b["metadata"]["collection"] = "Banter"
        all_memories.append(b)
    for c in code:
        c["metadata"]["collection"] = "Code"
        all_memories.append(c)

    # Sort by distance (relevance)
    all_memories.sort(key=lambda x: x["distance"])

    return {
        "query": query,
        "memories": all_memories[:10]
    }
