"""
Autonomous — User Model

Represents an authenticated user of the platform.  Each user has a role
(``admin`` or ``operator``) that governs access to privileged endpoints.

Security notes:
  - Passwords are stored as bcrypt hashes via ``passlib``.
  - The ``is_active`` flag allows soft-disabling accounts without deletion.
  - Username and email carry unique constraints to prevent duplicates.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, String, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.banter import Banter
    from app.models.refresh_token import RefreshToken
    from app.models.audit_log import AuditLog


class User(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "users"

    # ------------------------------------------------------------------
    # Columns
    # ------------------------------------------------------------------
    username: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False
    )
    email: Mapped[str] = mapped_column(
        String(320), unique=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(
        String(128), nullable=False
    )
    role: Mapped[str] = mapped_column(
        String(16), nullable=False, default="operator"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    banter_messages: Mapped[List["Banter"]] = relationship(
        back_populates="sender", lazy="selectin"
    )
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )
    audit_logs: Mapped[List["AuditLog"]] = relationship(
        back_populates="user", lazy="selectin"
    )

    # ------------------------------------------------------------------
    # Indexes
    # ------------------------------------------------------------------
    __table_args__ = (
        Index("ix_users_role", "role"),
        Index("ix_users_is_active", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<User id={self.id!r} username={self.username!r} role={self.role!r}>"
