"""
Autonomous — Tool Arsenal API Router

Provides REST endpoints for browsing, searching, and executing tools
from the Tool Registry.  All endpoints require authentication.

Endpoints:
  GET  /api/tools                — List all tools (with optional filters)
  GET  /api/tools/categories     — List all tool categories with counts
  GET  /api/tools/stats          — Tool registry statistics
  GET  /api/tools/{tool_id}      — Get a single tool definition
  POST /api/tools/search         — Search tools by keyword
  POST /api/tools/generate       — Generate a command for a tool
  POST /api/tools/confirm        — Confirm and generate a dangerous command
  GET  /api/tools/os/{os_name}   — List tools by OS compatibility
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.core.tool_registry import (
    TOOL_REGISTRY, get_all_tools,
    get_categories,
    get_tools_by_os,
    get_tool_by_id,
    search_tools
)
from app.core.command_engine import generate_command, CommandGenerationError
from app.core.audit import record_audit
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tools", tags=["Tool Arsenal"])


# ======================================================================
# Request / Response Schemas
# ======================================================================

class ToolSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=256)


class CommandGenerateRequest(BaseModel):
    tool_id: str = Field(..., min_length=1, max_length=64)
    target_os: str = Field(..., pattern=r"^(linux|windows|android)$")
    params: Dict[str, str] = Field(default_factory=dict)


class CommandConfirmRequest(BaseModel):
    tool_id: str = Field(..., min_length=1, max_length=64)
    target_os: str = Field(..., pattern=r"^(linux|windows|android)$")
    params: Dict[str, str] = Field(default_factory=dict)
    confirmation_code: str = Field(..., min_length=1, max_length=64,
                                   description="Must be 'CONFIRM' to proceed")


class ToolSummary(BaseModel):
    """Lightweight tool representation for list views."""
    id: str
    name: str
    description: str
    category: str
    severity: str
    os_support: List[str]
    requires_confirmation: bool
    tags: List[str] = []


class ToolDetail(BaseModel):
    """Full tool definition including params and templates."""
    id: str
    name: str
    description: str
    category: str
    severity: str
    os_support: List[str]
    requires_confirmation: bool
    install_commands: Dict[str, str]
    documentation: str
    params: List[Dict[str, Any]]
    command_templates: Dict[str, str]
    estimated_duration: int
    tags: List[str] = []


class CategoryInfo(BaseModel):
    name: str
    tool_count: int
    tools: List[ToolSummary]


# ======================================================================
# Endpoints
# ======================================================================

@router.get("", response_model=List[ToolSummary])
async def list_tools(
    category: Optional[str] = Query(None, description="Filter by category"),
    os: Optional[str] = Query(None, pattern=r"^(linux|windows|android)$", description="Filter by OS"),
    severity: Optional[str] = Query(None, pattern=r"^(info|warning|danger)$", description="Filter by severity"),
    current_user: User = Depends(get_current_user),
):
    """
    List all tools in the arsenal with optional filtering.
    Supports filtering by category, OS, and severity level.
    """
    tools = get_all_tools()

    if category:
        tools = [t for t in tools if t["category"].lower() == category.lower()]
    if os:
        tools = [t for t in tools if os in t["os_support"]]
    if severity:
        tools = [t for t in tools if t["severity"] == severity]

    return [
        ToolSummary(
            id=t["id"],
            name=t["name"],
            description=t["description"],
            category=t["category"],
            severity=t["severity"],
            os_support=t["os_support"],
            requires_confirmation=t["requires_confirmation"],
            tags=t.get("tags", []),
        )
        for t in tools
    ]


@router.get("/categories", response_model=List[CategoryInfo])
async def list_categories(
    current_user: User = Depends(get_current_user),
):
    """List all tool categories with tool counts and tool summaries."""
    categories = get_categories()

    cat_tools_map = defaultdict(list)
    for t in TOOL_REGISTRY:
        cat_tools_map[t["category"]].append(t)

    result = []
    for cat in categories:
        cat_tools = cat_tools_map[cat]
        result.append(CategoryInfo(
            name=cat,
            tool_count=len(cat_tools),
            tools=[
                ToolSummary(
                    id=t["id"],
                    name=t["name"],
                    description=t["description"],
                    category=t["category"],
                    severity=t["severity"],
                    os_support=t["os_support"],
                    requires_confirmation=t["requires_confirmation"],
                    tags=t.get("tags", []),
                )
                for t in cat_tools
            ],
        ))
    return result


@router.get("/stats")
async def tool_stats(
    current_user: User = Depends(get_current_user),
):
    """Return aggregate statistics about the tool registry."""
    tools = get_all_tools()
    categories = get_categories()

    os_counts = {"linux": 0, "windows": 0, "android": 0}
    severity_counts = {"info": 0, "warning": 0, "danger": 0}
    category_counts = {cat: 0 for cat in categories}
    confirmation_required = 0

    for t in tools:
        for os_name in t["os_support"]:
            os_counts[os_name] = os_counts.get(os_name, 0) + 1
        severity_counts[t["severity"]] = severity_counts.get(t["severity"], 0) + 1
        if t["requires_confirmation"]:
            confirmation_required += 1

        cat = t["category"]
        if cat in category_counts:
            category_counts[cat] += 1
        else:
            category_counts[cat] = 1

    return {
        "total_tools": len(tools),
        "total_categories": len(categories),
        "categories": category_counts,
        "os_support": os_counts,
        "severity_breakdown": severity_counts,
        "confirmation_required": confirmation_required,
    }


@router.get("/os/{os_name}", response_model=List[ToolSummary])
async def list_tools_by_os(
    os_name: str,
    current_user: User = Depends(get_current_user),
):
    """List all tools compatible with a specific operating system."""
    if os_name not in ("linux", "windows", "android"):
        raise HTTPException(status_code=400, detail="OS must be linux, windows, or android")

    tools = get_tools_by_os(os_name)
    return [
        ToolSummary(
            id=t["id"],
            name=t["name"],
            description=t["description"],
            category=t["category"],
            severity=t["severity"],
            os_support=t["os_support"],
            requires_confirmation=t["requires_confirmation"],
            tags=t.get("tags", []),
        )
        for t in tools
    ]


@router.get("/{tool_id}", response_model=ToolDetail)
async def get_tool(
    tool_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get the full definition of a single tool including parameters and command templates."""
    tool = get_tool_by_id(tool_id)
    if tool is None:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found")

    return ToolDetail(**tool)


@router.post("/search", response_model=List[ToolSummary])
async def search_tools_endpoint(
    body: ToolSearchRequest,
    current_user: User = Depends(get_current_user),
):
    """Search tools by keyword across names, descriptions, and tags."""
    results = search_tools(body.query)
    return [
        ToolSummary(
            id=t["id"],
            name=t["name"],
            description=t["description"],
            category=t["category"],
            severity=t["severity"],
            os_support=t["os_support"],
            requires_confirmation=t["requires_confirmation"],
            tags=t.get("tags", []),
        )
        for t in results
    ]


@router.post("/generate")
async def generate_tool_command(
    body: CommandGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a command for a tool with the given parameters.

    If the tool requires confirmation (severity=danger), the response
    will include a 'requires_confirmation' status instead of the command.
    Use the /confirm endpoint to proceed.
    """
    try:
        command, metadata = generate_command(
            tool_id=body.tool_id,
            target_os=body.target_os,
            params=body.params,
            skip_confirmation=False,
        )

        # Audit log
        await record_audit(
            db=db,
            user_id=current_user.id,
            action="tool_command_generated",
            entity_type="tool",
            entity_id=body.tool_id,
            details={
                "target_os": body.target_os,
                "params": body.params,
                "status": metadata.get("status"),
            },
        )
        await db.commit()

        return metadata

    except CommandGenerationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/confirm")
async def confirm_and_generate(
    body: CommandConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Confirm execution of a dangerous tool and generate the command.

    Requires the confirmation_code to be exactly 'CONFIRM'.
    Only admin users can confirm dangerous tool executions.
    """
    # Only admins can confirm dangerous tools
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin users can confirm dangerous tool executions."
        )

    if body.confirmation_code != "CONFIRM":
        raise HTTPException(
            status_code=400,
            detail="Invalid confirmation code. Send 'CONFIRM' to proceed."
        )

    try:
        command, metadata = generate_command(
            tool_id=body.tool_id,
            target_os=body.target_os,
            params=body.params,
            skip_confirmation=True,
        )

        # Audit log for confirmed dangerous execution
        await record_audit(
            db=db,
            user_id=current_user.id,
            action="dangerous_tool_confirmed",
            entity_type="tool",
            entity_id=body.tool_id,
            details={
                "target_os": body.target_os,
                "params": body.params,
                "command": command,
                "severity": metadata.get("severity"),
            },
        )
        await db.commit()

        logger.warning(
            f"DANGEROUS TOOL CONFIRMED: user={current_user.username} "
            f"tool={body.tool_id} os={body.target_os}"
        )

        return metadata

    except CommandGenerationError as e:
        raise HTTPException(status_code=400, detail=str(e))
