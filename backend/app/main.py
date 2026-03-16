"""
Swarm Suite — Application Entry Point

Assembles the FastAPI application with all routers, middleware, and
startup/shutdown lifecycle hooks.

Run with:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.api import agents, analytics, auth, banter, missions, ws
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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle hooks."""
    logger.info("Starting Swarm Suite API v%s", APP_VERSION)
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
    
    logger.info("Shutting down Swarm Suite API.")


app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,
    description=APP_DESCRIPTION,
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS Middleware
# ---------------------------------------------------------------------------
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
app.include_router(ws.router)


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
