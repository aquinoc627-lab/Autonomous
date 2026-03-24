"""
Autonomous — OSINT API Tests

Tests for the /api/osint/sherlock/{username} endpoint.
"""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from tests.conftest import auth_headers


@pytest.mark.asyncio
async def test_sherlock_returns_error_when_not_installed(client, admin_token):
    """When sherlock is not in PATH, the endpoint returns a graceful error."""
    with patch(
        "asyncio.create_subprocess_exec",
        side_effect=FileNotFoundError("sherlock not found"),
    ):
        resp = await client.get(
            "/api/osint/sherlock/testuser",
            headers=auth_headers(admin_token),
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "error"
    assert "Sherlock is not installed" in data["message"]


@pytest.mark.asyncio
async def test_sherlock_returns_success_with_results(client, admin_token):
    """When sherlock finds accounts it returns them parsed correctly."""
    mock_stdout = b"[+] GitHub: https://github.com/testuser\n[+] Twitter: https://twitter.com/testuser\n"

    mock_process = MagicMock()
    mock_process.communicate = AsyncMock(return_value=(mock_stdout, b""))

    with patch("asyncio.create_subprocess_exec", return_value=mock_process):
        resp = await client.get(
            "/api/osint/sherlock/testuser",
            headers=auth_headers(admin_token),
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["target"] == "testuser"
    assert data["accounts_found"] == 2
    assert any(r["site"] == "GitHub" for r in data["results"])
    assert any(r["site"] == "Twitter" for r in data["results"])


@pytest.mark.asyncio
async def test_sherlock_returns_empty_when_no_accounts(client, admin_token):
    """When sherlock finds no accounts, returns an empty results list."""
    mock_process = MagicMock()
    mock_process.communicate = AsyncMock(return_value=(b"", b""))

    with patch("asyncio.create_subprocess_exec", return_value=mock_process):
        resp = await client.get(
            "/api/osint/sherlock/ghostuser",
            headers=auth_headers(admin_token),
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["accounts_found"] == 0
    assert data["results"] == []


@pytest.mark.asyncio
async def test_sherlock_rejects_invalid_username(client, admin_token):
    """Usernames with shell-injection characters are rejected."""
    # Use a username with a semicolon (no slash so no 307 redirect)
    resp = await client.get(
        "/api/osint/sherlock/user%3Brm",  # "user;rm"
        headers=auth_headers(admin_token),
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "error"
    assert "Invalid username" in data["message"]


@pytest.mark.asyncio
async def test_sherlock_requires_authentication(client):
    """Unauthenticated requests must be rejected with 401."""
    resp = await client.get("/api/osint/sherlock/testuser")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_sherlock_operator_token_allowed(client, operator_token):
    """Operator-level users can also run Sherlock scans."""
    mock_process = MagicMock()
    mock_process.communicate = AsyncMock(return_value=(b"", b""))

    with patch("asyncio.create_subprocess_exec", return_value=mock_process):
        resp = await client.get(
            "/api/osint/sherlock/testuser",
            headers=auth_headers(operator_token),
        )

    assert resp.status_code == 200
    assert resp.json()["status"] == "success"
