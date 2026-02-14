"""
CEAP Pydantic Schemas — Events
"""
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class EventCreate(BaseModel):
    title: str
    slug: str
    description: Optional[str] = None
    event_type: str  # hackathon/coding_contest/mcq_exam/project
    banner_url: Optional[str] = None
    registration_start: Optional[datetime] = None
    registration_end: Optional[datetime] = None
    event_start: Optional[datetime] = None
    event_end: Optional[datetime] = None
    max_participants: Optional[int] = None
    team_min_size: int = 1
    team_max_size: int = 1
    is_team_event: bool = False
    eligibility_rules: Optional[dict] = {}
    scoring_formula: Optional[dict] = {"auto": 0.7, "judge": 0.3}


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    banner_url: Optional[str] = None
    registration_start: Optional[datetime] = None
    registration_end: Optional[datetime] = None
    event_start: Optional[datetime] = None
    event_end: Optional[datetime] = None
    max_participants: Optional[int] = None
    scoring_formula: Optional[dict] = None


class EventResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    title: str
    slug: str
    description: Optional[str] = None
    event_type: str
    status: str
    banner_url: Optional[str] = None
    registration_start: Optional[datetime] = None
    registration_end: Optional[datetime] = None
    event_start: Optional[datetime] = None
    event_end: Optional[datetime] = None
    max_participants: Optional[int] = None
    is_team_event: bool
    team_min_size: int
    team_max_size: int
    scoring_formula: Optional[dict] = None
    created_at: datetime
    registration_count: Optional[int] = None

    class Config:
        from_attributes = True


class EventListResponse(BaseModel):
    events: List[EventResponse]
    total: int
    page: int
    page_size: int


# Registration
class RegistrationCreate(BaseModel):
    event_id: UUID
    team_id: Optional[UUID] = None


class RegistrationResponse(BaseModel):
    id: UUID
    event_id: UUID
    user_id: UUID
    team_id: Optional[UUID] = None
    status: str
    registered_at: datetime

    class Config:
        from_attributes = True


# Teams
class TeamCreate(BaseModel):
    event_id: UUID
    name: str


class TeamJoin(BaseModel):
    invite_code: str


class TeamResponse(BaseModel):
    id: UUID
    event_id: UUID
    name: str
    invite_code: str
    leader_id: Optional[UUID] = None
    is_locked: bool
    member_count: Optional[int] = None

    class Config:
        from_attributes = True
