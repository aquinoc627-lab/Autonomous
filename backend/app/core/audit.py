"""
Autonomous — Audit Logging Utility

Provides a reusable helper for recording audit log entries from any API
handler.  Every mutation (create, update, delete) and authentication event
should call ``record_audit`` to maintain a complete forensic trail.

Usage in a route handler::

    from app.core.audit import record_audit

    await record_audit(
        db=db,
        user_id=current_user.id,
        action="create",
        entity_type="agent",
        entity_id=agent.id,
        details={"name": agent.name},
        request=request,
    )
"""

from __future__ import annotations

from typing import Any, Optional

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


def _extract_ip(request: Optional[Request]) -> Optional[str]:
    """Extract the client IP address from a FastAPI Request, if available."""
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


async def record_audit(
    db: AsyncSession,
    *,
    user_id: Optional[str],
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    details: Optional[dict[str, Any]] = None,
    request: Optional[Request] = None,
) -> AuditLog:
    """
    Create an immutable audit log entry.

    Parameters
    ----------
    db : AsyncSession
        The current database session (will be flushed but not committed).
    user_id : str | None
        The ID of the user who performed the action.
    action : str
        The action performed (e.g., "create", "update", "delete", "login").
    entity_type : str
        The type of entity affected (e.g., "agent", "mission", "banter").
    entity_id : str | None
        The ID of the affected entity.
    details : dict | None
        Additional context (before/after state, changed fields, etc.).
    request : Request | None
        The FastAPI request object for IP extraction.

    Returns
    -------
    AuditLog
        The created audit log entry.
    """
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip_address=_extract_ip(request),
    )
    db.add(entry)
    await db.flush()
    return entry
