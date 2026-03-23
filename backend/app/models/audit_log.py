"""
Autonomous — AuditLog Model

Immutable append-only log of security-relevant actions performed on the
platform.  Every mutation (create, update, delete) and authentication
event is recorded here for forensic analysis and compliance.

Design principles:
  - Rows are never updated or deleted (append-only).
  - ``details`` is a JSON column that captures before/after state or
    supplementary context without requiring schema changes.
  - ``ip_address`` is stored for traceability but must be handled in
    accordance with applicable privacy regulations.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class AuditLog(Base):
    __tablename__ = "audit_log"

    # ------------------------------------------------------------------
    # Columns
    # ------------------------------------------------------------------
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(
        String(64), nullable=False
    )
    entity_type: Mapped[str] = mapped_column(
        String(32), nullable=False
    )
    entity_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True
    )
    details: Mapped[Optional[Any]] = mapped_column(
        JSON, nullable=True
    )
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(45), nullable=True  # supports IPv6
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    user: Mapped[Optional["User"]] = relationship(
        back_populates="audit_logs", lazy="selectin"
    )

    # ------------------------------------------------------------------
    # Indexes
    # ------------------------------------------------------------------
    __table_args__ = (
        Index("ix_audit_log_user_id", "user_id"),
        Index("ix_audit_log_action", "action"),
        Index("ix_audit_log_entity", "entity_type", "entity_id"),
        Index("ix_audit_log_created_at", "created_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<AuditLog id={self.id!r} action={self.action!r} "
            f"entity={self.entity_type!r}/{self.entity_id!r}>"
        )
