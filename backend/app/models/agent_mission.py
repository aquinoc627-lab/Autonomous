"""
Autonomous — AgentMission Junction Table

Implements the many-to-many relationship between Agents and Missions.
Each row records which agent is assigned to which mission, when the
assignment was made, and by whom.

A unique constraint on (agent_id, mission_id) prevents duplicate
assignments.  Cascading deletes ensure that removing an Agent or Mission
automatically cleans up the corresponding assignment rows.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.agent import Agent
    from app.models.mission import Mission
    from app.models.user import User


class AgentMission(Base):
    __tablename__ = "agent_missions"

    # ------------------------------------------------------------------
    # Columns
    # ------------------------------------------------------------------
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    agent_id: Mapped[str] = mapped_column(
        ForeignKey("agents.id", ondelete="CASCADE"), nullable=False
    )
    mission_id: Mapped[str] = mapped_column(
        ForeignKey("missions.id", ondelete="CASCADE"), nullable=False
    )
    assigned_by: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    agent: Mapped["Agent"] = relationship(
        back_populates="agent_missions", lazy="selectin"
    )
    mission: Mapped["Mission"] = relationship(
        back_populates="agent_missions", lazy="selectin"
    )
    assigner: Mapped[Optional["User"]] = relationship(
        foreign_keys=[assigned_by], lazy="selectin"
    )

    # ------------------------------------------------------------------
    # Constraints & Indexes
    # ------------------------------------------------------------------
    __table_args__ = (
        UniqueConstraint("agent_id", "mission_id", name="uq_agent_mission"),
        Index("ix_agent_missions_agent_id", "agent_id"),
        Index("ix_agent_missions_mission_id", "mission_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<AgentMission agent_id={self.agent_id!r} "
            f"mission_id={self.mission_id!r}>"
        )
