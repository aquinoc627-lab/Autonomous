"""
Tests for the Authentication API (/api/auth).
"""

import pytest
from tests.conftest import auth_headers


@pytest.mark.asyncio
async def test_login_success(client):
    """Valid credentials should return a token pair."""
    resp = await client.post("/api/auth/login", json={
        "username": "owner.test@example.com",
        "password": "OwnerPass9X",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_invalid_password(client):
    """Wrong password should return 401."""
    resp = await client.post("/api/auth/login", json={
        "username": "owner.test@example.com",
        "password": "WrongPassword1!",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
    """Non-existent user should return 401."""
    resp = await client.post("/api/auth/login", json={
        "username": "nobody",
        "password": "Whatever1!",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client, admin_token):
    """Authenticated user should get their profile."""
    resp = await client.get("/api/auth/me", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "owner.test@example.com"
    assert data["role"] == "admin"


@pytest.mark.asyncio
async def test_me_unauthenticated(client):
    """Unauthenticated request should return 401."""
    resp = await client.get("/api/auth/me")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_token_refresh(client):
    """Refresh token should return a new token pair."""
    # Login first
    login_resp = await client.post("/api/auth/login", json={
        "username": "owner.test@example.com",
        "password": "OwnerPass9X",
    })
    tokens = login_resp.json()

    # Refresh
    resp = await client.post("/api/auth/refresh", json={
        "refresh_token": tokens["refresh_token"],
    })
    assert resp.status_code == 200
    new_tokens = resp.json()
    assert "access_token" in new_tokens
    assert "refresh_token" in new_tokens


@pytest.mark.asyncio
async def test_refresh_token_rotation(client):
    """Used refresh token should be revoked (rotation)."""
    login_resp = await client.post("/api/auth/login", json={
        "username": "owner.test@example.com",
        "password": "OwnerPass9X",
    })
    tokens = login_resp.json()

    # First refresh succeeds
    resp1 = await client.post("/api/auth/refresh", json={
        "refresh_token": tokens["refresh_token"],
    })
    assert resp1.status_code == 200

    # Second refresh with same token should fail (revoked)
    resp2 = await client.post("/api/auth/refresh", json={
        "refresh_token": tokens["refresh_token"],
    })
    assert resp2.status_code == 401


@pytest.mark.asyncio
async def test_register_open_to_users(client):
    """Registration should be available without prior authentication."""
    resp = await client.post(
        "/api/auth/register",
        json={
            "email": "new@example.com",
            "password": "NewUser123!",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == "new@example.com"
    assert data["role"] == "operator"


@pytest.mark.asyncio
async def test_register_rejects_duplicate_email(client):
    """Registration should reject duplicate email addresses."""
    first = await client.post(
        "/api/auth/register",
        json={
            "email": "dup@example.com",
            "password": "NewUser2Abc",
        },
    )
    assert first.status_code == 201

    resp = await client.post(
        "/api/auth/register",
        json={
            "email": "dup@example.com",
            "password": "NewUser2Abc",
        },
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_logout(client, admin_token):
    """Logout should revoke the refresh token."""
    login_resp = await client.post("/api/auth/login", json={
        "username": "owner.test@example.com",
        "password": "OwnerPass9X",
    })
    tokens = login_resp.json()

    resp = await client.post(
        "/api/auth/logout",
        json={"refresh_token": tokens["refresh_token"]},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 204

    # Refresh with revoked token should fail
    resp2 = await client.post("/api/auth/refresh", json={
        "refresh_token": tokens["refresh_token"],
    })
    assert resp2.status_code == 401
