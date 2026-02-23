"""
CEAP — MCQ Models
Question bank, options, and student attempts for MCQ exams.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Integer, Float, DateTime, Text,
    ForeignKey, UniqueConstraint
)
from app.database import Base
from app.database_types import GUID


class MCQQuestion(Base):
    """A single MCQ question belonging to a tenant."""
    __tablename__ = "mcq_questions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID(), ForeignKey("tenants.id"), nullable=False)
    event_id = Column(GUID(), ForeignKey("events.id"), nullable=True)

    question_text = Column(Text, nullable=False)
    option_a = Column(String(500), nullable=False)
    option_b = Column(String(500), nullable=False)
    option_c = Column(String(500), nullable=True)
    option_d = Column(String(500), nullable=True)
    correct_option = Column(String(1), nullable=False)  # 'a', 'b', 'c', or 'd'

    explanation = Column(Text, nullable=True)
    marks = Column(Float, default=1.0)
    negative_marks = Column(Float, default=0.0)
    difficulty = Column(String(20), default="medium")
    topic = Column(String(200), nullable=True)

    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class MCQAttempt(Base):
    """A student's attempt at an MCQ exam."""
    __tablename__ = "mcq_attempts"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    event_id = Column(GUID(), ForeignKey("events.id"), nullable=False)

    started_at = Column(DateTime, default=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)
    time_limit_minutes = Column(Integer, nullable=True)

    total_questions = Column(Integer, default=0)
    attempted = Column(Integer, default=0)
    correct = Column(Integer, default=0)
    wrong = Column(Integer, default=0)
    skipped = Column(Integer, default=0)
    score = Column(Float, default=0.0)
    max_score = Column(Float, default=0.0)

    answers_json = Column(Text, nullable=True)
    status = Column(String(20), default="in_progress")

    __table_args__ = (
        UniqueConstraint("user_id", "event_id", name="uq_user_event_attempt"),
    )
