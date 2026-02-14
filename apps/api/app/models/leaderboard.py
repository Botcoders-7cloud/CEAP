"""
CEAP Database Models — Leaderboard & Certificates
"""
import uuid
import secrets
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, DateTime, Text, ForeignKey, Numeric
from app.database import Base
from app.database_types import GUID


class LeaderboardEntry(Base):
    __tablename__ = "leaderboard_entries"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    event_id = Column(GUID(), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=True)
    team_id = Column(GUID(), ForeignKey("teams.id"), nullable=True)

    total_score = Column(Numeric(8, 2), default=0)
    problems_solved = Column(Integer, default=0)
    total_time = Column(Integer, default=0)
    penalty = Column(Integer, default=0)
    rank = Column(Integer, nullable=True)
    last_submission = Column(DateTime, nullable=True)


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    event_id = Column(GUID(), ForeignKey("events.id"), nullable=False)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    certificate_type = Column(String(20), nullable=True)  # participation/winner/runner_up
    template_id = Column(GUID(), nullable=True)
    rank = Column(Integer, nullable=True)
    score = Column(Numeric(8, 2), nullable=True)
    pdf_url = Column(Text, nullable=True)
    verification_id = Column(String(20), unique=True, default=lambda: secrets.token_urlsafe(12))
    issued_at = Column(DateTime, default=datetime.utcnow)
    downloaded_at = Column(DateTime, nullable=True)


class CertificateTemplate(Base):
    __tablename__ = "certificate_templates"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID(), ForeignKey("tenants.id"), nullable=False)
    name = Column(String(100), nullable=False)
    template_html = Column(Text, nullable=False)
    background_url = Column(Text, nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
