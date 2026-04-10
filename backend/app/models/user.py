from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional
from datetime import datetime

from sqlalchemy import Boolean, String, Index, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.banter import Banter
    from app.models.refresh_token import RefreshToken
    from app.models.audit_log import AuditLog
    from app.models.api_key import ApiKey


class User(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "users"

    # ------------------------------------------------------------------
    # Columns
    # ------------------------------------------------------------------
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(128), nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False, default="operator")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Tiering & Subscriptions
    tier: Mapped[str] = mapped_column(String(32), nullable=False, default="free_trial")
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    trial_end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

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
    api_keys: Mapped[List["ApiKey"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )

    # ------------------------------------------------------------------
    # Indexes
    # ------------------------------------------------------------------
    __table_args__ = (
        Index("ix_users_role", "role"),
        Index("ix_users_is_active", "is_active"),
        Index("ix_users_tier", "tier"),
    )

    def __repr__(self) -> str:
        return f"<User id={self.id!r} username={self.username!r} role={self.role!r} tier={self.tier!r}>"
