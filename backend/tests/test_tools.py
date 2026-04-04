"""
Autonomous — Tool Arsenal API Tests

Tests for the /api/tools endpoints.
"""

from __future__ import annotations

import pytest
from tests.conftest import auth_headers

@pytest.mark.asyncio
async def test_categories_returns_success(client, admin_token):
    """The /api/tools/categories endpoint should return a list of categories with tools grouped appropriately."""
    resp = await client.get(
        "/api/tools/categories",
        headers=auth_headers(admin_token),
    )

    assert resp.status_code == 200
    data = resp.json()

    assert isinstance(data, list)
    assert len(data) > 0

    # Check that each category is structured properly
    recon_category = None
    for cat in data:
        assert "name" in cat
        assert "tool_count" in cat
        assert "tools" in cat

        # tool_count should match the length of the tools list
        assert cat["tool_count"] == len(cat["tools"])

        # Check tool summary fields
        for tool in cat["tools"]:
            assert "id" in tool
            assert "name" in tool
            assert "description" in tool
            assert "category" in tool
            assert "severity" in tool
            assert "os_support" in tool
            assert "requires_confirmation" in tool
            assert "tags" in tool

            # The tool's category should match the category grouping
            assert tool["category"] == cat["name"]

        if cat["name"] == "Recon":
            recon_category = cat

    # Verify that the Recon category exists and has tools
    assert recon_category is not None
    assert recon_category["tool_count"] > 0

    # Verify we have known tools like nmap in Recon
    tool_ids = [t["id"] for t in recon_category["tools"]]
    assert "nmap" in tool_ids

@pytest.mark.asyncio
async def test_categories_requires_authentication(client):
    """The /api/tools/categories endpoint must require authentication."""
    resp = await client.get("/api/tools/categories")
    assert resp.status_code == 401
