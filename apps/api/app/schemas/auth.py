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
    department: Optional[str] = None
    college_id: Optional[str] = None
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
