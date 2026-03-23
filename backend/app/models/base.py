"""
Autonomous — Declarative Base & Common Mixins

Provides:
  - ``Base``           — the declarative base class for all ORM models
  - ``TimestampMixin`` — adds ``created_at`` / ``updated_at`` columns
  - ``UUIDPrimaryKey`` — adds a UUID ``id`` primary key column
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, func
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
)


class Base(DeclarativeBase):
    """Declarative base for all Autonomous ORM models."""
    pass


class TimestampMixin:
    """Mixin that adds ``created_at`` and ``updated_at`` audit columns."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class UUIDPrimaryKey:
    """Mixin that provides a UUID primary key column named ``id``."""

    id: Mapped[str] = mapped_column(
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
