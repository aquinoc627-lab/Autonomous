"""
Autonomous — Ghost Protocol API

Endpoints:
  POST /api/ghost/toggle   — spin up or tear down the ephemeral Tor proxy container
  GET  /api/ghost/status   — check whether the proxy container is currently running
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

# Attempt to initialise the Docker client; fall back to None if unavailable.
try:
    import docker  # type: ignore

    _docker_client = docker.from_env()
    logger.info("Docker client initialised for Ghost Protocol.")
except Exception:
    docker = None  # type: ignore[assignment]
    _docker_client = None
    logger.warning(
        "Docker SDK not available or daemon unreachable. "
        "Ghost Protocol endpoints will return an appropriate error."
    )

_CONTAINER_NAME = "autonomous-ghost-proxy"
_TOR_IMAGE = "peterdavehello/tor-socks-proxy:latest"

router = APIRouter(prefix="/api/ghost", tags=["Ghost Protocol"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _toggle_proxy(enable: bool) -> dict:
    """Blocking helper — run via asyncio.to_thread to avoid blocking the event loop."""
    if _docker_client is None:
        return {
            "status": "error",
            "message": "Docker not available. Cannot initiate Ghost Protocol.",
        }

    try:
        existing = _docker_client.containers.get(_CONTAINER_NAME)
        if not enable:
            existing.stop()
            existing.remove()
            return {
                "status": "success",
                "message": "Ghost Protocol DEACTIVATED. Traces wiped.",
            }
        return {
            "status": "success",
            "message": "Ghost Protocol is already active.",
        }
    except docker.errors.NotFound:
        if enable:
            _docker_client.containers.run(
                image=_TOR_IMAGE,
                name=_CONTAINER_NAME,
                detach=True,
                # Map container Tor port 9150 → host 9050
                ports={"9150/tcp": 9050},
            )
            return {
                "status": "success",
                "message": "Ghost Protocol ACTIVATED. Ephemeral relay established.",
            }
        return {
            "status": "success",
            "message": "Ghost Protocol is currently offline.",
        }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/toggle", summary="Spin up or tear down the Tor proxy container")
async def toggle_ghost_protocol(
    enable: bool,
    current_user: User = Depends(get_current_user),
):
    """
    When **enable=true** — pull (if needed) and start an ephemeral Tor proxy
    container that binds the container's port 9150 to the host's port 9050.

    When **enable=false** — stop and remove the proxy container.
    """
    if _docker_client is None:
        return {
            "status": "error",
            "message": "Docker not available. Cannot initiate Ghost Protocol.",
        }
    try:
        result = await asyncio.to_thread(_toggle_proxy, enable)
        return result
    except Exception as exc:  # pragma: no cover
        logger.exception("Ghost Protocol toggle error")
        return {"status": "error", "message": str(exc)}


@router.get("/status", summary="Check whether the Tor proxy container is running")
async def get_ghost_status(
    current_user: User = Depends(get_current_user),
):
    """Returns ``{"status": "success", "active": <bool>}``."""
    if _docker_client is None:
        return {"status": "error", "message": "Docker not available."}
    try:
        container = await asyncio.to_thread(
            _docker_client.containers.get, _CONTAINER_NAME
        )
        return {"status": "success", "active": container.status == "running"}
    except Exception:
        # NotFound or any other Docker error → proxy is not active
        return {"status": "success", "active": False}
