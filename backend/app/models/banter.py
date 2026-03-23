"""
Autonomous — Banter Model

Represents a message in the real-time communication feed.  Banter is
polymorphic: a message can be associated with a specific mission, a specific
agent, both, or neither (global broadcast).

Message types:
  - ``chat``          — user-authored message
  - ``system``        — platform-generated notification
  - ``alert``         — high-priority system alert
  - ``status_update`` — automated status change notification

Filtering support:
  - By mission:  ``WHERE mission_id = :id``
  - By agent:    ``WHERE agent_id = :id``
  - By sender:   ``WHERE sender_id = :id``
  - Chronological ordering via the indexed ``created_at`` column.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.agent import Agent
    from app.models.mission import Mission
    from app.models.user import User


class Banter(Base, UUIDPrimaryKey):
    __tablename__ = "banter"

    # ------------------------------------------------------------------
    # Columns
    # ------------------------------------------------------------------
    message: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    message_type: Mapped[str] = mapped_column(
        String(16), nullable=False, default="chat"
    )

    # Polymorphic references — all nullable to support flexible scoping
    sender_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    mission_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("missions.id", ondelete="SET NULL"), nullable=True
    )
    agent_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("agents.id", ondelete="SET NULL"), nullable=True
    )

    # Timestamp — explicit column (not from mixin) for precise control
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    sender: Mapped[Optional["User"]] = relationship(
        back_populates="banter_messages", lazy="selectin"
    )
    mission: Mapped[Optional["Mission"]] = relationship(
        back_populates="banter_messages", lazy="selectin"
    )
    agent: Mapped[Optional["Agent"]] = relationship(
        back_populates="banter_messages", lazy="selectin"
    )

    # ------------------------------------------------------------------
    # Indexes — optimised for the most common query patterns
    # ------------------------------------------------------------------
    __table_args__ = (
        Index("ix_banter_mission_id", "mission_id"),
        Index("ix_banter_agent_id", "agent_id"),
        Index("ix_banter_sender_id", "sender_id"),
        Index("ix_banter_created_at", "created_at"),
        Index("ix_banter_message_type", "message_type"),
        # Composite index for the common "banter for mission X, newest first"
        Index("ix_banter_mission_created", "mission_id", "created_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<Banter id={self.id!r} type={self.message_type!r} "
            f"mission={self.mission_id!r} agent={self.agent_id!r}>"
        )
