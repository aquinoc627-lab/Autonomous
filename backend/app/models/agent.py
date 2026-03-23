"""
Autonomous — Agent Model

Represents an autonomous agent within Autonomous.  Agents can be assigned to
one or more missions via the ``agent_missions`` junction table.

Status lifecycle:  idle → active → idle | offline | error
"""

from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import ForeignKey, JSON, String, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.agent_mission import AgentMission
    from app.models.banter import Banter
    from app.models.user import User


class Agent(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "agents"

    # ------------------------------------------------------------------
    # Columns
    # ------------------------------------------------------------------
    name: Mapped[str] = mapped_column(
        String(128), unique=True, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="idle"
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    persona: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True, default=None,
        comment="Agent persona: avatar_color, icon, personality, voice_style",
    )
    created_by: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    creator: Mapped[Optional["User"]] = relationship(
        foreign_keys=[created_by], lazy="selectin"
    )
    agent_missions: Mapped[List["AgentMission"]] = relationship(
        back_populates="agent", cascade="all, delete-orphan", lazy="selectin"
    )
    banter_messages: Mapped[List["Banter"]] = relationship(
        back_populates="agent", lazy="selectin"
    )

    # ------------------------------------------------------------------
    # Indexes
    # ------------------------------------------------------------------
    __table_args__ = (
        Index("ix_agents_status", "status"),
    )

    def __repr__(self) -> str:
        return f"<Agent id={self.id!r} name={self.name!r} status={self.status!r}>"
