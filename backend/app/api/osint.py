"""
Autonomous — OSINT API Router

Provides REST endpoints for Open Source Intelligence (OSINT) operations.
All endpoints require authentication.

Endpoints:
  GET  /api/osint/sherlock/{username}  — Run Sherlock username search
"""

from __future__ import annotations

import asyncio
import logging
import re

from fastapi import APIRouter, Depends, Path
from pydantic import BaseModel
from typing import List

from app.core.security import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/osint", tags=["OSINT"])

# ---------------------------------------------------------------------------
# Response Schemas
# ---------------------------------------------------------------------------

class SherlockResult(BaseModel):
    site: str
    url: str


class SherlockResponse(BaseModel):
    target: str
    status: str
    accounts_found: int
    results: List[SherlockResult]


class SherlockErrorResponse(BaseModel):
    status: str
    message: str


# ---------------------------------------------------------------------------
# Input validation
# ---------------------------------------------------------------------------

_USERNAME_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/sherlock/{username}",
    summary="Username & Identity Tracking via Sherlock",
    description=(
        "Runs Sherlock against a target username and returns discovered "
        "accounts across 300+ platforms. Requires Sherlock to be installed "
        "in the execution environment."
    ),
)
async def run_sherlock(
    username: str = Path(
        ...,
        min_length=1,
        max_length=64,
        description="Target username to search for",
    ),
    current_user: User = Depends(get_current_user),
):
    """
    Run Sherlock to enumerate accounts for a given username.

    Returns a list of platforms where the username was found, along with
    direct profile URLs.
    """
    if not _USERNAME_RE.match(username):
        return {
            "status": "error",
            "message": "Invalid username. Only alphanumeric characters, dots, underscores, and hyphens are allowed.",
        }

    results = []
    cmd = ["sherlock", username, "--print-found", "--timeout", "3"]

    logger.info(
        "OSINT Sherlock scan initiated: user=%s target=%s",
        current_user.username,
        username,
    )

    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await process.communicate()
        output = stdout.decode(errors="replace")

        for line in output.split("\n"):
            if "[+]" in line:
                # Strip the "[+]" marker, then split on the first colon only
                # so that URL schemes (e.g. "https:") are preserved intact.
                clean = line.replace("[+]", "", 1).strip()
                if ":" in clean:
                    site, _, url = clean.partition(":")
                    site = site.strip()
                    url = url.strip()
                    if site and url:
                        results.append({"site": site, "url": url})

        logger.info(
            "OSINT Sherlock scan complete: user=%s target=%s accounts_found=%d",
            current_user.username,
            username,
            len(results),
        )

        return {
            "target": username,
            "status": "success",
            "accounts_found": len(results),
            "results": results,
        }

    except FileNotFoundError:
        logger.warning("Sherlock not found in PATH")
        return {
            "status": "error",
            "message": "Sherlock is not installed or not in PATH.",
        }
    except Exception as exc:
        logger.error("Sherlock scan failed: %s", exc)
        return {"status": "error", "message": str(exc)}
