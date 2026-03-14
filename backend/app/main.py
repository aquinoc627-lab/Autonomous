"""
Swarm Suite — Application Entry Point

Assembles the FastAPI application with all routers, middleware, and
startup/shutdown lifecycle hooks.

Run with:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import agents, analytics, auth, banter, missions, ws
from app.core.config import (
    APP_DESCRIPTION,
    APP_TITLE,
    APP_VERSION,
    CORS_ORIGINS,
)
from app.core.database import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle hooks."""
    logger.info("Starting Swarm Suite API v%s", APP_VERSION)
    await init_db()
    logger.info("Database tables verified.")
    yield
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
