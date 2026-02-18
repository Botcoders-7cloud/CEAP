"""
CEAP Models Package
Imports all models so Alembic and SQLAlchemy can discover them.
"""
from app.models.tenant import Tenant, User, AuditLog, StudentWhitelist
from app.models.event import Event, EventRound, EventTemplate, Registration, Team, TeamMember
from app.models.problem import (
    Problem, TestCase, StarterCode, EventProblem,
    Submission, SubmissionResult, JudgeScore, Rubric
)
from app.models.leaderboard import LeaderboardEntry, Certificate, CertificateTemplate

__all__ = [
    "Tenant", "User", "AuditLog", "StudentWhitelist",
    "Event", "EventRound", "EventTemplate", "Registration", "Team", "TeamMember",
    "Problem", "TestCase", "StarterCode", "EventProblem",
    "Submission", "SubmissionResult", "JudgeScore", "Rubric",
    "LeaderboardEntry", "Certificate", "CertificateTemplate",
]
