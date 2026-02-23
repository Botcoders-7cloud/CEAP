"""
CEAP Pydantic Schemas — Auth
Request/response schemas for authentication endpoints.
Includes input validation for security.
"""
import re
from pydantic import BaseModel, EmailStr, field_validator, Field
from typing import Optional, Literal
from uuid import UUID


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=100)
    tenant_slug: str = Field(..., min_length=2, max_length=50, pattern=r"^[a-z0-9\-]+$")
    role: Literal["student", "faculty"] = "student"
    join_code: Optional[str] = None
    faculty_key: Optional[str] = None
    roll_number: Optional[str] = Field(None, max_length=30)
    department: Optional[str] = Field(None, max_length=100)
    college_id: Optional[str] = Field(None, max_length=50)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    tenant_slug: str = Field(..., min_length=2, max_length=50)


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
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    college_id: Optional[str] = Field(None, max_length=50)
    avatar_url: Optional[str] = None


# ── Forgot Password Schemas ──────────────────
class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    tenant_slug: str = Field(..., min_length=2, max_length=50)


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


# ── Admin Schemas ─────────────────────────────
class AdminCreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=100)
    role: Literal["faculty", "admin"] = "faculty"
    department: Optional[str] = Field(None, max_length=100)


class AdminUpdateUserRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    role: Optional[str] = None
    status: Optional[Literal["active", "pending", "suspended"]] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8, max_length=128)


class RotateKeysRequest(BaseModel):
    rotate_join_code: bool = False
    rotate_faculty_key: bool = False


class KeysResponse(BaseModel):
    join_code: Optional[str]
    faculty_key: Optional[str]
