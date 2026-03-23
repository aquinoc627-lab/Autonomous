"""
Autonomous — Async Database Engine & Session Factory

Provides:
  - ``engine``       — the global async SQLAlchemy engine
  - ``async_session`` — a session-maker bound to the engine
  - ``get_db()``     — FastAPI dependency that yields a session per request
  - ``init_db()``    — creates all tables (useful for dev / testing)

The engine is configured from ``config.DATABASE_URL`` and automatically
handles the SQLite-specific ``check_same_thread`` requirement.
"""

from __future__ import annotations

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

from app.core.config import DATABASE_URL, DATABASE_ECHO

# ---------------------------------------------------------------------------
# Engine creation
# ---------------------------------------------------------------------------
_connect_args: dict = {}
_pool_class = None

if DATABASE_URL.startswith("sqlite"):
    # SQLite requires check_same_thread=False for async usage and benefits
    # from a StaticPool so the in-process DB file stays consistent.
    _connect_args = {"check_same_thread": False}
    _pool_class = StaticPool

engine = create_async_engine(
    DATABASE_URL,
    echo=DATABASE_ECHO,
    connect_args=_connect_args,
    poolclass=_pool_class,
    future=True,
)

# ---------------------------------------------------------------------------
# Session factory
# ---------------------------------------------------------------------------
async_session = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a database session and ensure it is closed after the request."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ---------------------------------------------------------------------------
# Table creation helper (dev / test only — use Alembic in production)
# ---------------------------------------------------------------------------
async def init_db() -> None:
    """Create all tables defined in the ORM metadata."""
    from app.models.base import Base  # noqa: local import to avoid circular deps

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
