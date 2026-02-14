"""
CEAP Pydantic Schemas — Problems & Submissions
"""
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


# Problems
class ProblemCreate(BaseModel):
    title: str
    slug: str
    problem_type: str  # coding/mcq/file_upload
    difficulty: str = "medium"
    description: str
    input_format: Optional[str] = None
    output_format: Optional[str] = None
    constraints: Optional[str] = None
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None
    options: Optional[list] = None  # for MCQ
    time_limit_ms: int = 2000
    memory_limit_kb: int = 262144
    allowed_languages: List[str] = ["python", "cpp", "java", "javascript"]
    tags: List[str] = []
    co_mapping: Optional[dict] = None
    po_mapping: Optional[dict] = None


class ProblemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    input_format: Optional[str] = None
    output_format: Optional[str] = None
    constraints: Optional[str] = None
    time_limit_ms: Optional[int] = None
    memory_limit_kb: Optional[int] = None
    tags: Optional[List[str]] = None


class ProblemResponse(BaseModel):
    id: UUID
    title: str
    slug: str
    problem_type: str
    difficulty: str
    description: str
    input_format: Optional[str] = None
    output_format: Optional[str] = None
    constraints: Optional[str] = None
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None
    options: Optional[list] = None
    time_limit_ms: int
    memory_limit_kb: int
    allowed_languages: List[str]
    tags: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Test Cases
class TestCaseCreate(BaseModel):
    input: str
    expected_output: str
    is_sample: bool = False
    weight: int = 1


class TestCaseResponse(BaseModel):
    id: UUID
    input: str
    expected_output: str
    is_sample: bool
    weight: int

    class Config:
        from_attributes = True


# Submissions
class SubmissionCreate(BaseModel):
    event_id: UUID
    problem_id: UUID
    language: str
    source_code: str


class SubmissionResponse(BaseModel):
    id: UUID
    event_id: UUID
    problem_id: UUID
    user_id: UUID
    language: str
    status: str
    score: Optional[float] = None
    execution_time: Optional[int] = None
    memory_used: Optional[int] = None
    submitted_at: datetime
    judged_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SubmissionDetailResponse(SubmissionResponse):
    source_code: str
    results: List["SubmissionResultResponse"] = []


class SubmissionResultResponse(BaseModel):
    id: UUID
    test_case_id: Optional[UUID] = None
    status: Optional[str] = None
    actual_output: Optional[str] = None
    execution_time: Optional[int] = None
    memory_used: Optional[int] = None
    passed: bool

    class Config:
        from_attributes = True


# Leaderboard
class LeaderboardEntryResponse(BaseModel):
    rank: int
    user_id: Optional[UUID] = None
    team_id: Optional[UUID] = None
    user_name: Optional[str] = None
    team_name: Optional[str] = None
    total_score: float
    problems_solved: int
    total_time: int
    last_submission: Optional[datetime] = None


class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntryResponse]
    total: int
    updated_at: datetime
