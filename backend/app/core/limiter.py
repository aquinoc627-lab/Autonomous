"""
Autonomous — Rate Limiter

Single shared Limiter instance used by the FastAPI application and
individual route handlers.  Importing from here (rather than from
app.main) avoids circular import issues.
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import RATE_LIMIT_DEFAULT

limiter = Limiter(key_func=get_remote_address, default_limits=[RATE_LIMIT_DEFAULT])
