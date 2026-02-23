"""
CEAP API — Auth Routes
Login, token refresh, user profile, password management.
Students login with CSV-imported credentials.
Faculty can join via faculty_key (creates pending account).
"""
import re
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.tenant import Tenant, User
from app.schemas.auth import (
    LoginRequest, TokenResponse, UserResponse,
    RefreshTokenRequest, UpdateProfileRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
)
from app.core.security import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token, get_current_user
)
from app.core.limiter import limiter
from app.services.audit import log_action

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Login ─────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Login with email and password.
    Students: use credentials from CSV import.
    Faculty: if account doesn't exist but faculty_key is valid, creates a pending account.
    """
    result = await db.execute(select(Tenant).where(Tenant.slug == req.tenant_slug))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Organization not found")

    result = await db.execute(
        select(User).where(User.tenant_id == tenant.id, User.email == req.email)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    if user.status == "pending":
        raise HTTPException(
            status_code=403,
            detail="Your account is pending admin approval. Please wait for approval."
        )
    if user.status == "suspended":
        raise HTTPException(status_code=403, detail="Account has been suspended")

    user.last_login = datetime.utcnow()

    # Check if user needs to change password on first login
    must_change = getattr(user, "must_change_password", False)

    token_data = {"sub": str(user.id), "tenant_id": str(user.tenant_id), "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    response = TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )

    # Audit log
    await log_action(db, user_id=str(user.id), tenant_id=str(user.tenant_id), action="user.login", entity_type="user", entity_id=str(user.id))

    # Add must_change_password flag to response if needed
    result_dict = response.model_dump()
    if must_change:
        result_dict["must_change_password"] = True

    return result_dict


# ── Faculty Join ──────────────────────────────────────────────
class FacultyJoinRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=100)
    faculty_key: str
    tenant_slug: str = Field(..., min_length=2, max_length=50)
    department: str | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


@router.post("/faculty-join", status_code=201)
@limiter.limit("3/minute")
async def faculty_join(request: Request, req: FacultyJoinRequest, db: AsyncSession = Depends(get_db)):
    """
    Faculty joins the platform with a faculty key.
    Creates a pending account — admin must approve before login works.
    """
    result = await db.execute(select(Tenant).where(Tenant.slug == req.tenant_slug))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Organization not found")
    if not tenant.is_active:
        raise HTTPException(status_code=403, detail="Organization is inactive")

    # Validate faculty key
    if not tenant.faculty_key or req.faculty_key != tenant.faculty_key:
        raise HTTPException(status_code=403, detail="Invalid faculty key")

    # Check if already exists
    existing = await db.execute(
        select(User).where(User.tenant_id == tenant.id, User.email == req.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered. Please login instead.")

    user = User(
        tenant_id=tenant.id,
        email=req.email,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        role="faculty",
        status="pending",
        department=req.department,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    return {
        "message": "Faculty account created. Pending admin approval.",
        "user": UserResponse.model_validate(user).model_dump(),
    }


# ── Token Refresh ─────────────────────────────────────────────
@router.post("/refresh", response_model=dict)
async def refresh_token(req: RefreshTokenRequest):
    """Refresh access token."""
    payload = decode_token(req.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    token_data = {"sub": payload["sub"], "tenant_id": payload["tenant_id"], "role": payload["role"]}
    new_access_token = create_access_token(token_data)

    return {"access_token": new_access_token, "token_type": "bearer"}


# ── Get Profile ───────────────────────────────────────────────
@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Get current user profile."""
    return UserResponse.model_validate(user)


# ── Update Profile ────────────────────────────────────────────
@router.put("/me", response_model=UserResponse)
async def update_me(
    req: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user profile."""
    if req.full_name is not None:
        user.full_name = req.full_name
    if req.department is not None:
        user.department = req.department
    if req.college_id is not None:
        user.college_id = req.college_id
    if req.avatar_url is not None:
        user.avatar_url = req.avatar_url

    await db.flush()
    await db.refresh(user)
    return UserResponse.model_validate(user)


# ── Change Password ──────────────────────────────────────────
class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


@router.post("/change-password")
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    req: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """User changes their own password. Must provide current password."""
    if not verify_password(req.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.password_hash = hash_password(req.new_password)
    # Clear must_change_password flag if set
    if hasattr(user, "must_change_password"):
        user.must_change_password = False
    await db.flush()
    return {"message": "Password changed successfully"}


# ── Forgot Password ──────────────────────────────────────────
@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    req: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send password reset email. Always returns 200 to prevent email enumeration."""
    result = await db.execute(select(Tenant).where(Tenant.slug == req.tenant_slug))
    tenant = result.scalar_one_or_none()
    if not tenant:
        return {"message": "If an account exists with that email, a reset link has been sent."}

    result = await db.execute(
        select(User).where(User.tenant_id == tenant.id, User.email == req.email)
    )
    user = result.scalar_one_or_none()

    if user:
        token = secrets.token_urlsafe(32)
        user.password_reset_token = token
        user.password_reset_expires = datetime.utcnow() + timedelta(hours=1)
        await db.flush()

        try:
            from app.services.email_service import send_password_reset
            await send_password_reset(user.email, user.full_name, token)
        except Exception as e:
            print(f"⚠️ Email send failed (non-fatal): {e}")
            print(f"🔑 Reset token for {user.email}: {token}")

    return {"message": "If an account exists with that email, a reset link has been sent."}


# ── Reset Password ───────────────────────────────────────────
@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    req: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using token from email."""
    result = await db.execute(
        select(User).where(
            User.password_reset_token == req.token,
            User.password_reset_expires > datetime.utcnow(),
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user.password_hash = hash_password(req.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    await db.flush()

    return {"message": "Password has been reset successfully. You can now log in."}
