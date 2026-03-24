"""
Autonomous — Dynamic Lab Environments API

Endpoints:
  GET   /api/labs               — list available labs and their running status
  POST  /api/labs/start/{lab_id} — pull and start a designated vulnerable lab
  POST  /api/labs/stop/{lab_id}  — stop and remove a running lab
"""

from __future__ import annotations

import asyncio
import logging
import time

from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Docker client — initialised once at import time so it can be reused across
# requests.  Failures are silently swallowed so that the rest of the API
# continues to work even when Docker is not available.
# ---------------------------------------------------------------------------
try:
    import docker
    import docker.errors

    _docker_client = docker.from_env()
except Exception:  # pragma: no cover
    docker = None  # type: ignore[assignment]
    _docker_client = None

# ---------------------------------------------------------------------------
# Pre-approved catalogue of vulnerable lab images.
# Only images listed here can be started; users cannot specify arbitrary images.
# ---------------------------------------------------------------------------
AVAILABLE_LABS: dict[str, dict] = {
    "juice-shop": {
        "name": "OWASP Juice Shop",
        "image": "bkimminich/juice-shop:latest",
        "container_port": 3000,
        "description": "Modern web application packed with OWASP Top 10 vulnerabilities.",
    },
    "bwapp": {
        "name": "bWAPP",
        "image": "raesene/bwapp:latest",
        "container_port": 80,
        "description": "An extremely buggy web app for practicing manual and automated exploitation.",
    },
}

router = APIRouter(prefix="/api/labs", tags=["Labs"])


# ---------------------------------------------------------------------------
# GET /api/labs
# ---------------------------------------------------------------------------
@router.get("")
async def get_labs(current_user: User = Depends(get_current_user)):
    """Returns the list of available labs and their current running status."""
    if not _docker_client:
        return {
            "status": "error",
            "message": "Docker client not initialized. Is /var/run/docker.sock mounted?",
        }

    def check_status() -> list[dict]:
        results: list[dict] = []
        for lab_id, config in AVAILABLE_LABS.items():
            container_name = f"autonomous-lab-{lab_id}"
            is_running = False
            host_port: str | None = None
            try:
                container = _docker_client.containers.get(container_name)
                is_running = container.status == "running"
                if is_running:
                    ports = container.attrs.get("NetworkSettings", {}).get("Ports") or {}
                    port_key = f"{config['container_port']}/tcp"
                    mappings = ports.get(port_key) or []
                    if mappings:
                        host_port = mappings[0]["HostPort"]
            except docker.errors.NotFound:
                pass
            results.append(
                {
                    "id": lab_id,
                    "name": config["name"],
                    "description": config["description"],
                    "running": is_running,
                    "url": f"http://localhost:{host_port}" if host_port else None,
                }
            )
        return results

    try:
        labs_status = await asyncio.to_thread(check_status)
        return {"status": "success", "labs": labs_status}
    except Exception as exc:  # pragma: no cover
        logger.exception("Error listing labs")
        return {"status": "error", "message": str(exc)}


# ---------------------------------------------------------------------------
# POST /api/labs/start/{lab_id}
# ---------------------------------------------------------------------------
@router.post("/start/{lab_id}")
async def start_lab(lab_id: str, current_user: User = Depends(get_current_user)):
    """Pull and start a designated vulnerable lab container."""
    if not _docker_client:
        return {"status": "error", "message": "Docker not available."}
    if lab_id not in AVAILABLE_LABS:
        return {"status": "error", "message": "Invalid lab ID."}

    config = AVAILABLE_LABS[lab_id]
    container_name = f"autonomous-lab-{lab_id}"

    def deploy_container() -> dict:
        # Re-use an already-running container
        try:
            existing = _docker_client.containers.get(container_name)
            if existing.status == "running":
                ports = existing.attrs.get("NetworkSettings", {}).get("Ports") or {}
                port_key = f"{config['container_port']}/tcp"
                mappings = ports.get(port_key) or []
                host_port = mappings[0]["HostPort"] if mappings else None
                return {
                    "status": "success",
                    "message": f"{config['name']} is already running.",
                    "url": f"http://localhost:{host_port}" if host_port else None,
                }
            # Stopped container — remove it so we can start fresh
            existing.remove(force=True)
        except docker.errors.NotFound:
            pass

        container = _docker_client.containers.run(
            image=config["image"],
            name=container_name,
            detach=True,
            ports={f"{config['container_port']}/tcp": None},
        )
        
        # Wait for port mappings to be populated
        for _ in range(3):
            container.reload()
            ports = container.attrs.get("NetworkSettings", {}).get("Ports") or {}
            port_key = f"{config['container_port']}/tcp"
            mappings = ports.get(port_key) or []
            if mappings:
                break
            time.sleep(0.5)

        mappings = ports.get(port_key) or []
        host_port = mappings[0]["HostPort"] if mappings else None
        return {
            "status": "success",
            "message": f"{config['name']} started!",
            "url": f"http://localhost:{host_port}" if host_port else None,
        }

    try:
        result = await asyncio.to_thread(deploy_container)
        return result
    except Exception as exc:  # pragma: no cover
        logger.exception("Error starting lab %s", lab_id)
        return {"status": "error", "message": str(exc)}


# ---------------------------------------------------------------------------
# POST /api/labs/stop/{lab_id}
# ---------------------------------------------------------------------------
@router.post("/stop/{lab_id}")
async def stop_lab(lab_id: str, current_user: User = Depends(get_current_user)):
    """Stop and remove a running lab container."""
    if not _docker_client:
        return {"status": "error", "message": "Docker not available."}

    container_name = f"autonomous-lab-{lab_id}"

    def kill_container() -> dict:
        try:
            container = _docker_client.containers.get(container_name)
            container.stop()
            container.remove()
            return {"status": "success", "message": f"Lab {lab_id} stopped and cleaned up."}
        except docker.errors.NotFound:
            return {"status": "error", "message": "Lab container not found."}

    try:
        result = await asyncio.to_thread(kill_container)
        return result
    except Exception as exc:  # pragma: no cover
        logger.exception("Error stopping lab %s", lab_id)
        return {"status": "error", "message": str(exc)}
