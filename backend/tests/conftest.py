"""
Autonomous — Test Configuration & Fixtures

Provides:
  - An isolated in-memory SQLite database for each test session
  - An async HTTPX test client bound to the FastAPI app
  - Pre-authenticated admin and operator tokens
  - Helper functions for creating test entities
"""

import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# Override DATABASE_URL before any app imports
import os
os.environ["DATABASE_URL"] = "sqlite+aiosqlite://"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"

from app.main import app
from app.core.database import engine, init_db, async_session
from app.core.security import hash_password
from app.models.base import Base
from app.models.user import User


@pytest.fixture(scope="session")
def event_loop():
    """Create a single event loop for the entire test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def setup_db():
    """Create all tables once for the test session."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed test users
    async with async_session() as db:
        admin = User(
            id="test-admin-id",
            username="owner.test@example.com",
            email="owner.test@example.com",
            hashed_password=hash_password("OwnerPass9X"),
            role="admin",
            is_active=True,
        )
        operator = User(
            id="test-operator-id",
            username="member.test@example.com",
            email="member.test@example.com",
            hashed_password=hash_password("MemberPass9X"),
            role="operator",
            is_active=True,
        )
        db.add_all([admin, operator])
        await db.commit()

    yield

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client(setup_db):
    """Provide an async HTTPX test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def admin_token(client):
    """Get an admin JWT token."""
    resp = await client.post("/api/auth/login", json={
        "username": "owner.test@example.com",
        "password": "OwnerPass9X",
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def operator_token(client):
    """Get an operator JWT token."""
    resp = await client.post("/api/auth/login", json={
        "username": "member.test@example.com",
        "password": "MemberPass9X",
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


def auth_headers(token: str) -> dict:
    """Return Authorization headers for a given token."""
    return {"Authorization": f"Bearer {token}"}
