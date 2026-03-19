"""
theHIVE — Pydantic Schemas (Request / Response Validation)

Every value entering or leaving the API passes through these schemas.
Strict validation prevents malformed data from reaching the database
and ensures consistent response shapes for the frontend.

Enums are used for constrained fields (status, role, priority, message_type)
so that invalid values are rejected at the validation layer rather than
at the database constraint layer.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional, List

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
import re


# ======================================================================
# Enums — single source of truth for constrained string fields
# ======================================================================

class UserRole(str, Enum):
    admin = "admin"
    operator = "operator"


class AgentStatus(str, Enum):
    idle = "idle"
    active = "active"
    offline = "offline"
    error = "error"


class MissionStatus(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class MissionPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class BanterMessageType(str, Enum):
    chat = "chat"
    system = "system"
    alert = "alert"
    status_update = "status_update"


# ======================================================================
# User Schemas
# ======================================================================

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = UserRole.operator

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


# ======================================================================
# Agent Schemas
# ======================================================================

class AgentPersona(BaseModel):
    """Visual and behavioral identity for an agent."""
    avatar_color: str = Field("#00f0ff", pattern=r"^#[0-9a-fA-F]{6}$")
    icon: str = Field("shield", description="Icon key: shield, crosshair, eye, brain, bolt, satellite")
    personality: str = Field("analytical", description="Personality trait displayed in UI")
    voice_style: str = Field("neutral", description="Voice style: neutral, assertive, calm, urgent")


class AgentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: Optional[str] = Field(None, max_length=2048)
    status: AgentStatus = AgentStatus.idle
    persona: Optional[AgentPersona] = None


class AgentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    status: AgentStatus
    description: Optional[str]
    persona: Optional[dict] = None
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime


class AgentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    description: Optional[str] = Field(None, max_length=2048)
    status: Optional[AgentStatus] = None
    persona: Optional[AgentPersona] = None


# ======================================================================
# Mission Schemas
# ======================================================================

class MissionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=256)
    description: Optional[str] = Field(None, max_length=4096)
    status: MissionStatus = MissionStatus.pending
    priority: MissionPriority = MissionPriority.medium
    parent_id: Optional[str] = None


class MissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str]
    status: MissionStatus
    priority: MissionPriority
    created_by: Optional[str]
    parent_id: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    sub_tasks: List[MissionRead] = []


class MissionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=256)
    description: Optional[str] = Field(None, max_length=4096)
    status: Optional[MissionStatus] = None
    priority: Optional[MissionPriority] = None
    parent_id: Optional[str] = None


# ======================================================================
# AgentMission (Assignment) Schemas
# ======================================================================

class AgentMissionCreate(BaseModel):
    agent_id: str
    mission_id: str


class AgentMissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    agent_id: str
    mission_id: str
    assigned_by: Optional[str]
    assigned_at: datetime


# ======================================================================
# Banter Schemas
# ======================================================================

class BanterCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=4096)
    message_type: BanterMessageType = BanterMessageType.chat
    mission_id: Optional[str] = None
    agent_id: Optional[str] = None


class BanterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    message: str
    message_type: BanterMessageType
    sender_id: Optional[str]
    mission_id: Optional[str]
    agent_id: Optional[str]
    created_at: datetime


class BanterFilter(BaseModel):
    """Query parameters for filtering banter messages."""
    mission_id: Optional[str] = None
    agent_id: Optional[str] = None
    sender_id: Optional[str] = None
    message_type: Optional[BanterMessageType] = None
    limit: int = Field(50, ge=1, le=200)
    offset: int = Field(0, ge=0)


# ======================================================================
# Auth Schemas
# ======================================================================

class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class LoginRequest(BaseModel):
    username: str
    password: str


# ======================================================================
# AuditLog Schemas
# ======================================================================

class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[str]
    action: str
    entity_type: str
    entity_id: Optional[str]
    details: Optional[Any]
    ip_address: Optional[str]
    created_at: datetime
