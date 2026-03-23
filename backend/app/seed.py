"""
Autonomous — Database Seeder

Populates the database with sample data for fast demo and development.
Run with:  python -m app.seed

Creates:
  - 2 users (admin + operator)
  - 5 agents with varied statuses
  - 5 missions with varied statuses and priorities
  - 8 agent-mission assignments
  - 12 banter messages across missions and agents
"""

from __future__ import annotations

import asyncio
import hashlib
import uuid
from datetime import datetime, timedelta, timezone

from passlib.hash import bcrypt

from app.core.database import async_session, init_db
from app.models import (
    Agent,
    AgentMission,
    AuditLog,
    Banter,
    Mission,
    User,
)


def _uid() -> str:
    return str(uuid.uuid4())


def _now(offset_hours: int = 0) -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=offset_hours)


async def seed() -> None:
    """Insert sample data into all tables."""
    await init_db()

    async with async_session() as session:
        # ------------------------------------------------------------------
        # Users
        # ------------------------------------------------------------------
        admin = User(
            id=_uid(),
            username="admin",
            email="admin@autonomous.local",
            hashed_password=bcrypt.hash("Admin123!"),
            role="admin",
            is_active=True,
        )
        operator = User(
            id=_uid(),
            username="operator1",
            email="operator1@autonomous.local",
            hashed_password=bcrypt.hash("Operator1!"),
            role="operator",
            is_active=True,
        )
        session.add_all([admin, operator])
        await session.flush()

        # ------------------------------------------------------------------
        # Agents
        # ------------------------------------------------------------------
        agents = [
            Agent(
                id=_uid(), name="Recon-Alpha", status="active",
                description="Primary reconnaissance agent — stealthy, fast, and precise.",
                created_by=admin.id,
                persona={
                    "avatar_color": "#00f0ff",
                    "icon": "satellite",
                    "personality": "Stealthy & Precise",
                    "voice_style": "calm",
                },
            ),
            Agent(
                id=_uid(), name="Recon-Bravo", status="idle",
                description="Secondary reconnaissance agent — patient observer, deep scanner.",
                created_by=admin.id,
                persona={
                    "avatar_color": "#39ff14",
                    "icon": "eye",
                    "personality": "Patient & Observant",
                    "voice_style": "neutral",
                },
            ),
            Agent(
                id=_uid(), name="Exploit-Charlie", status="active",
                description="Exploitation specialist — aggressive, adaptive, relentless.",
                created_by=admin.id,
                persona={
                    "avatar_color": "#ff006e",
                    "icon": "crosshair",
                    "personality": "Aggressive & Adaptive",
                    "voice_style": "assertive",
                },
            ),
            Agent(
                id=_uid(), name="Monitor-Delta", status="offline",
                description="Continuous monitoring agent — vigilant sentinel, never sleeps.",
                created_by=operator.id,
                persona={
                    "avatar_color": "#bf00ff",
                    "icon": "shield",
                    "personality": "Vigilant & Steadfast",
                    "voice_style": "calm",
                },
            ),
            Agent(
                id=_uid(), name="Analyst-Echo", status="error",
                description="Data analysis and reporting agent — brilliant but temperamental.",
                created_by=operator.id,
                persona={
                    "avatar_color": "#ff6b00",
                    "icon": "brain",
                    "personality": "Brilliant & Intense",
                    "voice_style": "urgent",
                },
            ),
        ]
        session.add_all(agents)
        await session.flush()

        # ------------------------------------------------------------------
        # Missions
        # ------------------------------------------------------------------
        missions = [
            Mission(id=_uid(), name="Perimeter Scan", description="Full network perimeter scan of external assets", status="in_progress", priority="high", created_by=admin.id, started_at=_now(-2)),
            Mission(id=_uid(), name="Credential Audit", description="Audit stored credentials and rotate expired keys", status="pending", priority="critical", created_by=admin.id),
            Mission(id=_uid(), name="Vulnerability Assessment", description="Run vulnerability scans against staging environment", status="completed", priority="medium", created_by=operator.id, started_at=_now(-48), completed_at=_now(-24)),
            Mission(id=_uid(), name="Threat Intelligence Sync", description="Synchronize threat feeds from external sources", status="in_progress", priority="medium", created_by=operator.id, started_at=_now(-6)),
            Mission(id=_uid(), name="Incident Response Drill", description="Simulated breach response exercise", status="failed", priority="high", created_by=admin.id, started_at=_now(-72), completed_at=_now(-70)),
        ]
        session.add_all(missions)
        await session.flush()

        # ------------------------------------------------------------------
        # Agent ↔ Mission assignments
        # ------------------------------------------------------------------
        assignments = [
            AgentMission(agent_id=agents[0].id, mission_id=missions[0].id, assigned_by=admin.id),
            AgentMission(agent_id=agents[1].id, mission_id=missions[0].id, assigned_by=admin.id),
            AgentMission(agent_id=agents[2].id, mission_id=missions[1].id, assigned_by=admin.id),
            AgentMission(agent_id=agents[0].id, mission_id=missions[2].id, assigned_by=operator.id),
            AgentMission(agent_id=agents[3].id, mission_id=missions[3].id, assigned_by=operator.id),
            AgentMission(agent_id=agents[4].id, mission_id=missions[3].id, assigned_by=operator.id),
            AgentMission(agent_id=agents[2].id, mission_id=missions[4].id, assigned_by=admin.id),
            AgentMission(agent_id=agents[4].id, mission_id=missions[4].id, assigned_by=admin.id),
        ]
        session.add_all(assignments)
        await session.flush()

        # ------------------------------------------------------------------
        # Banter messages
        # ------------------------------------------------------------------
        banter = [
            Banter(id=_uid(), message="Perimeter scan initiated on all external IPs.", message_type="system", mission_id=missions[0].id, created_at=_now(-2)),
            Banter(id=_uid(), message="Recon-Alpha reporting: 47 open ports detected so far.", message_type="status_update", sender_id=operator.id, mission_id=missions[0].id, agent_id=agents[0].id, created_at=_now(-1.5)),
            Banter(id=_uid(), message="Recon-Bravo standing by for assignment.", message_type="chat", sender_id=operator.id, agent_id=agents[1].id, created_at=_now(-1)),
            Banter(id=_uid(), message="Credential audit queued — awaiting admin approval.", message_type="system", mission_id=missions[1].id, created_at=_now(-0.5)),
            Banter(id=_uid(), message="Vulnerability assessment complete. 12 findings, 3 critical.", message_type="alert", sender_id=operator.id, mission_id=missions[2].id, created_at=_now(-24)),
            Banter(id=_uid(), message="Threat feeds updated from 4 sources.", message_type="status_update", mission_id=missions[3].id, agent_id=agents[3].id, created_at=_now(-5)),
            Banter(id=_uid(), message="Monitor-Delta went offline unexpectedly.", message_type="alert", agent_id=agents[3].id, created_at=_now(-4)),
            Banter(id=_uid(), message="Incident response drill failed — timeout on containment step.", message_type="system", mission_id=missions[4].id, created_at=_now(-70)),
            Banter(id=_uid(), message="Analyst-Echo encountered a processing error on dataset 7.", message_type="alert", sender_id=admin.id, agent_id=agents[4].id, created_at=_now(-3)),
            Banter(id=_uid(), message="All agents, please report status.", message_type="chat", sender_id=admin.id, created_at=_now(-0.25)),
            Banter(id=_uid(), message="Exploit-Charlie ready for credential audit assignment.", message_type="chat", sender_id=operator.id, agent_id=agents[2].id, created_at=_now(-0.1)),
            Banter(id=_uid(), message="System health check: CPU 42%, Memory 67%, Disk 31%.", message_type="system", created_at=_now()),
        ]
        session.add_all(banter)

        # ------------------------------------------------------------------
        # Audit log entry for the seed itself
        # ------------------------------------------------------------------
        session.add(AuditLog(
            user_id=admin.id,
            action="seed",
            entity_type="system",
            entity_id=None,
            details={"note": "Database seeded with sample data"},
            ip_address="127.0.0.1",
        ))

        await session.commit()

    print("Database seeded successfully.")
    print("  Users:       admin / Admin123!   |   operator1 / Operator1!")
    print("  Agents:      5")
    print("  Missions:    5")
    print("  Assignments: 8")
    print("  Banter:      12")


if __name__ == "__main__":
    asyncio.run(seed())
