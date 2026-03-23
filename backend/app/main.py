"""
Autonomous — Application Entry Point

Assembles the FastAPI application with all routers, middleware, and
startup/shutdown lifecycle hooks.

Run with:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import asyncio
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api import agents, analytics, auth, banter, ghost, missions, tools, ws, playbooks
from app.core.config import (
    APP_DESCRIPTION,
    APP_TITLE,
    APP_VERSION,
    CORS_ORIGINS,
)
from app.core.database import init_db
from app.core.tasks import agent_brain_loop, set_autonomous_mode, get_autonomous_mode
from app.core.security import get_current_user
from app.models.user import User

# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}',
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Security Middleware
# ---------------------------------------------------------------------------
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        logger.info(
            f"method={request.method} path={request.url.path} status={response.status_code} duration={process_time:.4f}s"
        )
        return response


# ---------------------------------------------------------------------------
# Lifecycle Hooks
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle hooks."""
    logger.info("Starting Autonomous API v%s", APP_VERSION)
    await init_db()
    logger.info("Database tables verified.")
    
    # Start the Agent Brain background loop
    brain_task = asyncio.create_task(agent_brain_loop())
    logger.info("Agent Brain background loop started.")
    
    yield
    
    # Cancel the background task on shutdown
    brain_task.cancel()
    try:
        await brain_task
    except asyncio.CancelledError:
        logger.info("Agent Brain background loop cancelled.")
    
    logger.info("Shutting down Autonomous API.")


# ---------------------------------------------------------------------------
# Application Instance
# ---------------------------------------------------------------------------
app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,
    description=APP_DESCRIPTION,
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Middleware Registration
# ---------------------------------------------------------------------------
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(agents.router)
app.include_router(missions.router)
app.include_router(banter.router)
app.include_router(analytics.router)
app.include_router(tools.router)
app.include_router(ws.router)
app.include_router(playbooks.router)
app.include_router(ghost.router)


# ---------------------------------------------------------------------------
# Health check (unauthenticated)
# ---------------------------------------------------------------------------
@app.get("/", tags=["Health"])
async def root():
    """Basic health check endpoint."""
    return {
        "service": APP_TITLE,
        "version": APP_VERSION,
        "status": "operational",
    }


@app.get("/api/health", tags=["Health"])
async def health_check():
    """API health check endpoint."""
    return {"status": "ok"}

# ---------------------------------------------------------------------------
# Autonomous Mode Control
# ---------------------------------------------------------------------------
@app.get("/api/autonomous", tags=["Autonomous"])
async def get_autonomous_status(current_user: User = Depends(get_current_user)):
    """Get the current status of autonomous mode."""
    return {"enabled": get_autonomous_mode()}

@app.post("/api/autonomous", tags=["Autonomous"])
async def toggle_autonomous_mode(enabled: bool, current_user: User = Depends(get_current_user)):
    """Toggle autonomous mode on or off."""
    set_autonomous_mode(enabled)
    return {"enabled": get_autonomous_mode()}
