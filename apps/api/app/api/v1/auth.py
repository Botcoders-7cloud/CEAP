"""
CEAP API — Auth Routes
Handles registration, login, token refresh, user profile,
forgot-password, and reset-password — with rate limiting.
"""
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.tenant import Tenant, User, StudentWhitelist
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, UserResponse,
    RefreshTokenRequest, UpdateProfileRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
)
from app.core.security import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token, get_current_user
)
from app.core.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Register ──────────────────────────────────────────────────
@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit("3/minute")
async def register(request: Request, req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user under a tenant."""
    # Find tenant
    result = await db.execute(select(Tenant).where(Tenant.slug == req.tenant_slug))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Organization not found")
    if not tenant.is_active:
        raise HTTPException(status_code=403, detail="Organization is inactive")

    # ── Role-specific validation ────────────────────────────
    if req.role == "student":
        # Validate join code
        if tenant.join_code and req.join_code != tenant.join_code:
            raise HTTPException(status_code=403, detail="Invalid join code")

        # Validate roll number against whitelist (only if whitelist has entries)
        if req.roll_number:
            wl_result = await db.execute(
                select(StudentWhitelist).where(
                    StudentWhitelist.tenant_id == tenant.id,
                    StudentWhitelist.roll_number == req.roll_number.strip().upper()
                )
            )
            wl_entry = wl_result.scalar_one_or_none()
            count_result = await db.execute(
                select(StudentWhitelist).where(StudentWhitelist.tenant_id == tenant.id)
            )
            has_whitelist = len(count_result.scalars().all()) > 0
            if has_whitelist and not wl_entry:
                raise HTTPException(status_code=403, detail="Roll number not found in student list")
            if wl_entry and wl_entry.is_registered:
                raise HTTPException(status_code=409, detail="This roll number is already registered")
        user_status = "active"

    elif req.role == "faculty":
        if not req.faculty_key:
            raise HTTPException(status_code=400, detail="Faculty key is required for faculty registration")
        if tenant.faculty_key and req.faculty_key != tenant.faculty_key:
            raise HTTPException(status_code=403, detail="Invalid faculty key")
        user_status = "pending"

    # Check duplicate email within tenant
    existing = await db.execute(
        select(User).where(User.tenant_id == tenant.id, User.email == req.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    # Check student limit
    if req.role == "student":
        user_count_result = await db.execute(
            select(User).where(User.tenant_id == tenant.id, User.role == "student")
        )
        if len(user_count_result.scalars().all()) >= tenant.max_students:
            raise HTTPException(status_code=403, detail="Student limit reached for this organization")

    # Create user
    roll = req.roll_number.strip().upper() if req.roll_number else None
    user = User(
        tenant_id=tenant.id,
        email=req.email,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        role=req.role,
        status=user_status,
        roll_number=roll,
        department=req.department,
        college_id=req.college_id,
    )
    db.add(user)
    await db.flush()

    # Mark roll number as registered
    if req.role == "student" and roll:
        wl_update = await db.execute(
            select(StudentWhitelist).where(
                StudentWhitelist.tenant_id == tenant.id,
                StudentWhitelist.roll_number == roll
            )
        )
        wl_entry = wl_update.scalar_one_or_none()
        if wl_entry:
            wl_entry.is_registered = True

    await db.refresh(user)

    # Generate tokens
    token_data = {"sub": str(user.id), "tenant_id": str(tenant.id), "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


# ── Login ─────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email and password."""
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

    token_data = {"sub": str(user.id), "tenant_id": str(user.tenant_id), "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


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
from pydantic import BaseModel, Field, field_validator
import re


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
        # Generate a secure reset token
        token = secrets.token_urlsafe(32)
        user.password_reset_token = token
        user.password_reset_expires = datetime.utcnow() + timedelta(hours=1)
        await db.flush()

        # Send email (best-effort — log in dev, send in prod)
        try:
            from app.services.email_service import send_password_reset
            await send_password_reset(user.email, user.full_name, token)
        except Exception as e:
            print(f"⚠️ Email send failed (non-fatal): {e}")
            print(f"🔑 Reset token for {user.email}: {token}")

    # Always 200 to prevent email enumeration
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
