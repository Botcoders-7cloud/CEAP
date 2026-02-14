"""
CEAP Database Models — Problems, Test Cases, Submissions
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Integer, DateTime, Text, ForeignKey, Numeric
)
from sqlalchemy.orm import relationship
from app.database import Base
from app.database_types import GUID, JSON_TYPE, INET_TYPE


class Problem(Base):
    __tablename__ = "problems"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID(), ForeignKey("tenants.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False)
    problem_type = Column(String(20), nullable=False)  # coding/mcq/file_upload
    difficulty = Column(String(10), default="medium")  # easy/medium/hard

    # Content
    description = Column(Text, nullable=False)
    input_format = Column(Text, nullable=True)
    output_format = Column(Text, nullable=True)
    constraints = Column(Text, nullable=True)
    sample_input = Column(Text, nullable=True)
    sample_output = Column(Text, nullable=True)

    # MCQ fields
    options = Column(JSON_TYPE(), nullable=True)  # [{id, text, is_correct}]

    # Coding fields
    time_limit_ms = Column(Integer, default=2000)
    memory_limit_kb = Column(Integer, default=262144)  # 256MB
    # Store as JSON instead of ARRAY for SQLite compat
    allowed_languages = Column(JSON_TYPE(), default=["python", "cpp", "java", "javascript"])

    # Metadata
    tags = Column(JSON_TYPE(), default=[])
    co_mapping = Column(JSON_TYPE(), nullable=True)  # Course Outcome mapping
    po_mapping = Column(JSON_TYPE(), nullable=True)  # Program Outcome mapping

    is_public = Column(Boolean, default=False)
    created_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    test_cases = relationship("TestCase", back_populates="problem", cascade="all, delete-orphan")
    starter_codes = relationship("StarterCode", back_populates="problem", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="problem")


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    problem_id = Column(GUID(), ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    input = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=False)
    is_sample = Column(Boolean, default=False)  # visible to students
    weight = Column(Integer, default=1)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    problem = relationship("Problem", back_populates="test_cases")


class StarterCode(Base):
    __tablename__ = "starter_code"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    problem_id = Column(GUID(), ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    language = Column(String(20), nullable=False)
    code = Column(Text, nullable=False)

    problem = relationship("Problem", back_populates="starter_codes")


class EventProblem(Base):
    __tablename__ = "event_problems"

    event_id = Column(GUID(), ForeignKey("events.id", ondelete="CASCADE"), primary_key=True)
    problem_id = Column(GUID(), ForeignKey("problems.id"), primary_key=True)
    round_id = Column(GUID(), ForeignKey("event_rounds.id"), nullable=True)
    order_index = Column(Integer, default=0)
    points = Column(Integer, default=100)

    event = relationship("Event", back_populates="event_problems")
    problem = relationship("Problem")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    event_id = Column(GUID(), ForeignKey("events.id"), nullable=False, index=True)
    problem_id = Column(GUID(), ForeignKey("problems.id"), nullable=False)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False, index=True)
    team_id = Column(GUID(), ForeignKey("teams.id"), nullable=True)

    # Code
    language = Column(String(20), nullable=False)
    source_code = Column(Text, nullable=False)
    file_url = Column(Text, nullable=True)

    # Result
    status = Column(String(20), default="pending", index=True)
    score = Column(Numeric(5, 2), default=0)
    execution_time = Column(Integer, nullable=True)  # ms
    memory_used = Column(Integer, nullable=True)  # KB

    # Judge0
    judge_token = Column(String(100), nullable=True)

    submitted_at = Column(DateTime, default=datetime.utcnow)
    judged_at = Column(DateTime, nullable=True)

    # Anti-cheat
    ip_address = Column(INET_TYPE(), nullable=True)
    similarity_score = Column(Numeric(5, 2), nullable=True)

    # Relationships
    problem = relationship("Problem", back_populates="submissions")
    user = relationship("User", back_populates="submissions")
    results = relationship("SubmissionResult", back_populates="submission", cascade="all, delete-orphan")
    judge_scores = relationship("JudgeScore", back_populates="submission")


class SubmissionResult(Base):
    __tablename__ = "submission_results"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    submission_id = Column(GUID(), ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False)
    test_case_id = Column(GUID(), ForeignKey("test_cases.id"), nullable=True)
    status = Column(String(20), nullable=True)
    actual_output = Column(Text, nullable=True)
    execution_time = Column(Integer, nullable=True)
    memory_used = Column(Integer, nullable=True)
    passed = Column(Boolean, default=False)

    submission = relationship("Submission", back_populates="results")


class JudgeScore(Base):
    __tablename__ = "judge_scores"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    submission_id = Column(GUID(), ForeignKey("submissions.id"), nullable=False)
    judge_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    rubric_scores = Column(JSON_TYPE(), nullable=False)
    total_score = Column(Numeric(5, 2), nullable=True)
    feedback = Column(Text, nullable=True)
    scored_at = Column(DateTime, default=datetime.utcnow)

    submission = relationship("Submission", back_populates="judge_scores")


class Rubric(Base):
    __tablename__ = "rubrics"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID(), ForeignKey("tenants.id"), nullable=False)
    name = Column(String(100), nullable=False)
    criteria = Column(JSON_TYPE(), nullable=False)  # [{name, max_score, description}]
    event_type = Column(String(30), nullable=True)
    created_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
