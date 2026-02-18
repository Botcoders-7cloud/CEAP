"""
CEAP Database Models — Tenant & User
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Integer, DateTime, Text, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from app.database import Base
from app.database_types import GUID, JSON_TYPE, INET_TYPE


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    slug = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    logo_url = Column(Text)
    primary_color = Column(String(7), default="#6366f1")
    secondary_color = Column(String(7), default="#8b5cf6")
    plan = Column(String(20), default="starter")  # starter/campus/university
    features = Column(JSON_TYPE(), default={})
    max_events = Column(Integer, default=10)
    max_students = Column(Integer, default=500)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    # Registration keys
    join_code = Column(String(20), nullable=True)          # students must provide this
    faculty_key = Column(String(20), nullable=True)        # faculty must provide this

    # Relationships
    users = relationship("User", back_populates="tenant", lazy="selectin")
    events = relationship("Event", back_populates="tenant", lazy="selectin")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("tenant_id", "email", name="uq_tenant_email"),)

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID(), ForeignKey("tenants.id"), nullable=False, index=True)
    supabase_user_id = Column(String(255), nullable=True, unique=True)
    email = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="student")
    department = Column(String(100), nullable=True)
    college_id = Column(String(50), nullable=True)
    avatar_url = Column(Text, nullable=True)
    email_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    status = Column(String(20), default="active")          # active | pending | suspended
    roll_number = Column(String(30), nullable=True)        # students only
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    registrations = relationship("Registration", back_populates="user", lazy="selectin", foreign_keys="Registration.user_id")
    submissions = relationship("Submission", back_populates="user", lazy="selectin")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID(), ForeignKey("tenants.id"), nullable=False, index=True)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=True)
    action = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(GUID(), nullable=True)
    old_values = Column(JSON_TYPE(), nullable=True)
    new_values = Column(JSON_TYPE(), nullable=True)
    ip_address = Column(INET_TYPE(), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class StudentWhitelist(Base):
    """Roll number whitelist — only whitelisted students can register."""
    __tablename__ = "student_whitelist"
    __table_args__ = (
        UniqueConstraint("tenant_id", "roll_number", name="uq_tenant_roll"),
    )

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID(), ForeignKey("tenants.id"), nullable=False, index=True)
    roll_number = Column(String(30), nullable=False)
    name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    is_registered = Column(Boolean, default=False)  # True once student registers
    created_at = Column(DateTime, default=datetime.utcnow)
