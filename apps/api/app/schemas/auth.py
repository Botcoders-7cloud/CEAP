"""
CEAP Pydantic Schemas — Auth
Request/response schemas for authentication endpoints.
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    tenant_slug: str
    role: str = "student"           # "student" or "faculty"
    join_code: Optional[str] = None     # required for students
    faculty_key: Optional[str] = None   # required for faculty
    roll_number: Optional[str] = None   # required for students
    department: Optional[str] = None
    college_id: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str
    tenant_slug: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    status: str = "active"
    department: Optional[str] = None
    college_id: Optional[str] = None
    roll_number: Optional[str] = None
    avatar_url: Optional[str] = None
    tenant_id: UUID

    class Config:
        from_attributes = True


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    college_id: Optional[str] = None
    avatar_url: Optional[str] = None


# ── Admin Schemas ─────────────────────────────
class AdminCreateUserRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "faculty"           # faculty or admin
    department: Optional[str] = None


class AdminUpdateUserRequest(BaseModel):
    role: Optional[str] = None
    status: Optional[str] = None    # active | pending | suspended
    is_active: Optional[bool] = None


class RotateKeysRequest(BaseModel):
    rotate_join_code: bool = False
    rotate_faculty_key: bool = False


class KeysResponse(BaseModel):
    join_code: Optional[str]
    faculty_key: Optional[str]
