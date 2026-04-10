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
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler  # public-facing despite underscore; see slowapi docs
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api import agents, analytics, auth, banter, ghost, missions, tools, ws, playbooks, labs, osint, billing, api_keys, system_override
from app.core.config import (
    APP_DESCRIPTION,
    APP_TITLE,
    APP_VERSION,
    CORS_ORIGINS,
)
from app.core.limiter import limiter
from app.core.database import init_db
from app.core.exceptions import AppException
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

    # Run Alembic migrations to ensure the schema is current.
    try:
        from pathlib import Path
        from alembic.config import Config as AlembicConfig
        from alembic import command as alembic_command

        _alembic_ini = Path(__file__).resolve().parent.parent / "alembic.ini"
        logger.info("Running database migrations...")
        alembic_cfg = AlembicConfig(str(_alembic_ini))
        alembic_command.upgrade(alembic_cfg, "head")
        logger.info("Database migrations complete.")
    except Exception as exc:  # noqa: BLE001 — migration failures should not prevent startup
        logger.warning(
            "Alembic migrations failed (%s). Falling back to init_db().", exc
        )
        await init_db()
        logger.info("Database tables verified via init_db().")
    else:
        # Still call init_db to ensure any in-memory/test tables are present.
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

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
app.add_middleware(SlowAPIMiddleware)


# ---------------------------------------------------------------------------
# Global Exception Handlers
# ---------------------------------------------------------------------------
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Return a standardised JSON error body for AppException."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.error_code, "message": exc.message}},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Wrap FastAPI HTTPException into the standardised error format."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": "HTTP_ERROR", "message": str(exc.detail)}},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler for unexpected errors — log details, return generic message."""
    logger.exception("Unhandled exception for %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_SERVER_ERROR", "message": "Internal server error."}},
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
app.include_router(labs.router)
app.include_router(osint.router)
app.include_router(ghost.router)
app.include_router(billing.router, prefix="/api/billing", tags=["Billing"])
app.include_router(api_keys.router, prefix="/api/keys", tags=["API Keys"])
app.include_router(system_override.router, prefix="/api/system", tags=["System Override"])


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
