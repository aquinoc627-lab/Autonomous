"""
Autonomous — Mission Model

Represents a task or objective within the platform.  Missions progress
through a defined status lifecycle and can be assigned to multiple agents.

Status lifecycle:  pending → in_progress → completed | failed | cancelled
Priority levels:   low, medium, high, critical
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.agent_mission import AgentMission
    from app.models.banter import Banter
    from app.models.user import User


class Mission(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "missions"

    # ------------------------------------------------------------------
    # Columns
    # ------------------------------------------------------------------
    name: Mapped[str] = mapped_column(
        String(256), nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="pending"
    )
    priority: Mapped[str] = mapped_column(
        String(16), nullable=False, default="medium"
    )
    created_by: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    parent_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("missions.id", ondelete="CASCADE"), nullable=True
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    creator: Mapped[Optional["User"]] = relationship(
        foreign_keys=[created_by], lazy="selectin"
    )
    parent: Mapped[Optional["Mission"]] = relationship(
        remote_side="Mission.id", back_populates="sub_tasks", lazy="selectin"
    )
    sub_tasks: Mapped[List["Mission"]] = relationship(
        back_populates="parent", cascade="all, delete-orphan", lazy="selectin"
    )
    agent_missions: Mapped[List["AgentMission"]] = relationship(
        back_populates="mission", cascade="all, delete-orphan", lazy="selectin"
    )
    banter_messages: Mapped[List["Banter"]] = relationship(
        back_populates="mission", lazy="selectin"
    )

    # ------------------------------------------------------------------
    # Indexes
    # ------------------------------------------------------------------
    __table_args__ = (
        Index("ix_missions_status", "status"),
        Index("ix_missions_priority", "priority"),
        Index("ix_missions_created_at", "created_at"),
        Index("ix_missions_parent_id", "parent_id"),
    )

    def __repr__(self) -> str:
        return f"<Mission id={self.id!r} name={self.name!r} status={self.status!r}>"
