"""
CEAP Database Models — Events, Registrations, Teams
"""
import uuid
import secrets
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Integer, DateTime, Text, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base
from app.database_types import GUID, JSON_TYPE


class Event(Base):
    __tablename__ = "events"
    __table_args__ = (UniqueConstraint("tenant_id", "slug", name="uq_tenant_event_slug"),)

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID(), ForeignKey("tenants.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(String(30), nullable=False)  # hackathon/coding_contest/mcq_exam/project
    status = Column(String(20), default="draft")  # draft/published/ongoing/completed/archived
    banner_url = Column(Text, nullable=True)

    # Timing
    registration_start = Column(DateTime, nullable=True)
    registration_end = Column(DateTime, nullable=True)
    event_start = Column(DateTime, nullable=True)
    event_end = Column(DateTime, nullable=True)

    # Configuration
    max_participants = Column(Integer, nullable=True)
    team_min_size = Column(Integer, default=1)
    team_max_size = Column(Integer, default=1)
    is_team_event = Column(Boolean, default=False)
    eligibility_rules = Column(JSON_TYPE(), default={})

    # Scoring
    scoring_formula = Column(JSON_TYPE(), default={"auto": 0.7, "judge": 0.3})

    created_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="events")
    rounds = relationship("EventRound", back_populates="event", cascade="all, delete-orphan")
    registrations = relationship("Registration", back_populates="event", cascade="all, delete-orphan")
    teams = relationship("Team", back_populates="event", cascade="all, delete-orphan")
    event_problems = relationship("EventProblem", back_populates="event", cascade="all, delete-orphan")


class EventRound(Base):
    __tablename__ = "event_rounds"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    event_id = Column(GUID(), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    round_number = Column(Integer, nullable=False)
    title = Column(String(100), nullable=True)
    round_type = Column(String(30), nullable=True)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    is_elimination = Column(Boolean, default=False)
    advance_count = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    event = relationship("Event", back_populates="rounds")


class EventTemplate(Base):
    __tablename__ = "event_templates"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID(), ForeignKey("tenants.id"), nullable=False)
    name = Column(String(100), nullable=False)
    event_type = Column(String(30), nullable=False)
    config = Column(JSON_TYPE(), nullable=False)
    is_global = Column(Boolean, default=False)
    created_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Registration(Base):
    __tablename__ = "registrations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    event_id = Column(GUID(), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False, index=True)
    team_id = Column(GUID(), ForeignKey("teams.id"), nullable=True)
    status = Column(String(20), default="pending")
    registered_at = Column(DateTime, default=datetime.utcnow)
    approved_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    metadata_ = Column("metadata", JSON_TYPE(), default={})

    # Relationships
    event = relationship("Event", back_populates="registrations")
    user = relationship("User", back_populates="registrations", foreign_keys=[user_id])
    team = relationship("Team", back_populates="registrations")


class Team(Base):
    __tablename__ = "teams"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    event_id = Column(GUID(), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    invite_code = Column(String(20), unique=True, default=lambda: secrets.token_urlsafe(8))
    leader_id = Column(GUID(), ForeignKey("users.id"), nullable=True)
    is_locked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    event = relationship("Event", back_populates="teams")
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    registrations = relationship("Registration", back_populates="team")


class TeamMember(Base):
    __tablename__ = "team_members"

    team_id = Column(GUID(), ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(GUID(), ForeignKey("users.id"), primary_key=True)
    role = Column(String(20), default="member")
    joined_at = Column(DateTime, default=datetime.utcnow)

    team = relationship("Team", back_populates="members")
