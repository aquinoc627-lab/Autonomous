"""
Autonomous — Application Configuration

Centralised settings loaded from environment variables with sensible defaults
for local development.  Switch from SQLite to PostgreSQL by setting the
DATABASE_URL environment variable.

Security-critical values (SECRET_KEY, DATABASE_URL in production) MUST be
provided via environment variables and never hard-coded.
"""

from __future__ import annotations

import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend/
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
# Default: async SQLite for local development.
# Production: set DATABASE_URL=postgresql+asyncpg://user:pass@host/dbname
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    f"sqlite+aiosqlite:///{DATA_DIR / 'autonomous_suite.db'}",
)

# Echo SQL statements to stdout (useful for debugging, disable in production)
DATABASE_ECHO: bool = os.getenv("DATABASE_ECHO", "false").lower() == "true"

# ---------------------------------------------------------------------------
# Authentication / JWT
# ---------------------------------------------------------------------------
# IMPORTANT: Override SECRET_KEY in production with a strong random value.
SECRET_KEY: str = os.getenv("SECRET_KEY", "CHANGE-ME-IN-PRODUCTION-use-openssl-rand-hex-32")
JWT_ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# ---------------------------------------------------------------------------
# Authentication Mode: "jwt" (default) or "oauth"
# ---------------------------------------------------------------------------
# Set AUTH_MODE=oauth to switch from local JWT to external OAuth provider.
# When AUTH_MODE=oauth, the following variables must be set:
#   OAUTH_DOMAIN      — e.g., "your-tenant.auth0.com" or "your-okta-domain.okta.com"
#   OAUTH_CLIENT_ID   — OAuth application client ID
#   OAUTH_CLIENT_SECRET — OAuth application client secret
#   OAUTH_AUDIENCE    — API audience / resource identifier
#   OAUTH_ISSUER      — Token issuer URL (defaults to https://{OAUTH_DOMAIN}/)
AUTH_MODE: str = os.getenv("AUTH_MODE", "jwt")  # "jwt" or "oauth"
OAUTH_DOMAIN: str = os.getenv("OAUTH_DOMAIN", "")
OAUTH_CLIENT_ID: str = os.getenv("OAUTH_CLIENT_ID", "")
OAUTH_CLIENT_SECRET: str = os.getenv("OAUTH_CLIENT_SECRET", "")
OAUTH_AUDIENCE: str = os.getenv("OAUTH_AUDIENCE", "")
OAUTH_ISSUER: str = os.getenv("OAUTH_ISSUER", f"https://{OAUTH_DOMAIN}/" if OAUTH_DOMAIN else "")
OAUTH_ALGORITHMS: list[str] = ["RS256"]

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
CORS_ORIGINS: list[str] = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
).split(",")

# ---------------------------------------------------------------------------
# Application metadata
# ---------------------------------------------------------------------------
APP_TITLE: str = "Autonomous API"
APP_VERSION: str = "0.1.0"
APP_DESCRIPTION: str = "Orchestration platform for managing agents, missions, and real-time banter."
