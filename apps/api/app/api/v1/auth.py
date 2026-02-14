"""
CEAP API — Auth Routes
Handles registration, login, token refresh, and user profile.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.database import get_db
from app.models.tenant import Tenant, User
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, UserResponse,
    RefreshTokenRequest, UpdateProfileRequest
)
from app.core.security import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token, get_current_user
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user under a tenant."""
    # Find tenant
    result = await db.execute(select(Tenant).where(Tenant.slug == req.tenant_slug))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Check if tenant is active
    if not tenant.is_active:
        raise HTTPException(status_code=403, detail="Organization is inactive")

    # Check duplicate email
    existing = await db.execute(
        select(User).where(User.tenant_id == tenant.id, User.email == req.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    # Check student limit
    user_count = await db.execute(
        select(User).where(User.tenant_id == tenant.id, User.role == "student")
    )
    if len(user_count.scalars().all()) >= tenant.max_students:
        raise HTTPException(status_code=403, detail="Student limit reached for this organization")

    # Create user
    user = User(
        tenant_id=tenant.id,
        email=req.email,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        role="student",
        department=req.department,
        college_id=req.college_id,
    )
    db.add(user)
    await db.flush()
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


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email and password."""
    # Find tenant
    result = await db.execute(select(Tenant).where(Tenant.slug == req.tenant_slug))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Find user
    result = await db.execute(
        select(User).where(User.tenant_id == tenant.id, User.email == req.email)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    # Update last login
    user.last_login = datetime.utcnow()

    # Generate tokens
    token_data = {"sub": str(user.id), "tenant_id": str(user.tenant_id), "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=dict)
async def refresh_token(req: RefreshTokenRequest):
    """Refresh access token."""
    payload = decode_token(req.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    token_data = {"sub": payload["sub"], "tenant_id": payload["tenant_id"], "role": payload["role"]}
    new_access_token = create_access_token(token_data)

    return {"access_token": new_access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Get current user profile."""
    return UserResponse.model_validate(user)


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
