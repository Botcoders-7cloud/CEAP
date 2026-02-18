"""
CEAP API — Admin Routes
Admin-only endpoints for user management, key rotation, and student whitelist.
All endpoints require role == "admin" in the JWT.
"""
import secrets
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime

from app.database import get_db
from app.models.tenant import Tenant, User, StudentWhitelist
from app.schemas.auth import (
    UserResponse, AdminCreateUserRequest, AdminUpdateUserRequest,
    RotateKeysRequest, KeysResponse
)
from app.core.security import hash_password, get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency: only admin role can access these endpoints."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ── User Management ───────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    role: str = None,
    status: str = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """List all users in the tenant. Filter by role or status."""
    query = select(User).where(User.tenant_id == admin.tenant_id)
    if role:
        query = query.where(User.role == role)
    if status:
        query = query.where(User.status == status)
    query = query.order_by(User.created_at.desc())
    result = await db.execute(query)
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(
    req: AdminCreateUserRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Admin creates a faculty or admin account directly (no approval needed)."""
    if req.role not in ("faculty", "admin"):
        raise HTTPException(status_code=400, detail="Can only create faculty or admin accounts")

    # Check duplicate email
    existing = await db.execute(
        select(User).where(User.tenant_id == admin.tenant_id, User.email == req.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        tenant_id=admin.tenant_id,
        email=req.email,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        role=req.role,
        status="active",   # admin-created accounts are immediately active
        department=req.department,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    req: AdminUpdateUserRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Approve, suspend, or change role of a user."""
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == admin.tenant_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if req.role is not None:
        if req.role not in ("student", "faculty", "admin"):
            raise HTTPException(status_code=400, detail="Invalid role")
        user.role = req.role
    if req.status is not None:
        if req.status not in ("active", "pending", "suspended"):
            raise HTTPException(status_code=400, detail="Invalid status")
        user.status = req.status
        # Sync is_active with status
        user.is_active = req.status == "active"
    if req.is_active is not None:
        user.is_active = req.is_active
        user.status = "active" if req.is_active else "suspended"

    await db.flush()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Deactivate a user (soft delete)."""
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == admin.tenant_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Cannot deactivate admin accounts")

    user.is_active = False
    user.status = "suspended"
    await db.flush()
    return {"message": "User deactivated"}


# ── Registration Keys ─────────────────────────────────────────────────────────

@router.get("/keys", response_model=KeysResponse)
async def get_keys(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """View current join_code and faculty_key for the tenant."""
    result = await db.execute(select(Tenant).where(Tenant.id == admin.tenant_id))
    tenant = result.scalar_one_or_none()
    return KeysResponse(join_code=tenant.join_code, faculty_key=tenant.faculty_key)


@router.post("/keys/rotate", response_model=KeysResponse)
async def rotate_keys(
    req: RotateKeysRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Rotate join_code and/or faculty_key. Old keys immediately invalid."""
    result = await db.execute(select(Tenant).where(Tenant.id == admin.tenant_id))
    tenant = result.scalar_one_or_none()

    if req.rotate_join_code:
        tenant.join_code = secrets.token_urlsafe(8).upper()[:10]
    if req.rotate_faculty_key:
        tenant.faculty_key = "FAC-" + secrets.token_urlsafe(6).upper()[:8]

    await db.flush()
    return KeysResponse(join_code=tenant.join_code, faculty_key=tenant.faculty_key)


# ── Student Bulk Import ───────────────────────────────────────────────────────

@router.get("/students")
async def list_students(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """List all student accounts in this tenant."""
    result = await db.execute(
        select(User)
        .where(User.tenant_id == admin.tenant_id, User.role == "student")
        .order_by(User.full_name)
    )
    students = result.scalars().all()
    return [
        {
            "id": str(s.id),
            "roll_number": s.roll_number,
            "full_name": s.full_name,
            "email": s.email,
            "status": s.status,
            "department": s.department,
            "created_at": s.created_at,
        }
        for s in students
    ]


@router.post("/students/import")
async def import_students_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Bulk-create student accounts from a CSV file.
    CSV columns: roll_number, name (or full_name), email, password
    Students can login directly — no self-registration needed.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")   # handle BOM from Excel/Numbers
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))

    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="CSV file is empty or invalid")

    # Normalize headers: lowercase + underscores
    headers = {h.strip().lower().replace(" ", "_"): h for h in reader.fieldnames}

    # Detect columns flexibly
    def find_col(*keys):
        for k in keys:
            if k in headers:
                return headers[k]
        return None

    roll_col  = find_col("roll_number", "roll_no", "rollno", "roll", "student_id", "id")
    name_col  = find_col("name", "full_name", "student_name", "name_of_the_student")
    email_col = find_col("email", "mail_id", "mail", "email_id")
    pass_col  = find_col("password", "pass", "passwd", "temp_password")

    if not roll_col:
        raise HTTPException(
            status_code=400,
            detail=f"Could not find roll number column. Columns found: {list(reader.fieldnames)}"
        )

    # Get tenant for limit check
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == admin.tenant_id))
    tenant = tenant_result.scalar_one_or_none()

    inserted = 0
    skipped = 0
    errors = []

    for i, row in enumerate(reader, start=2):
        roll = (row.get(roll_col) or "").strip().upper()
        if not roll:
            continue

        name  = (row.get(name_col)  or "").strip() if name_col  else roll
        email = (row.get(email_col) or "").strip() if email_col else None
        pwd   = (row.get(pass_col)  or "").strip() if pass_col  else None

        # Use roll number as email if none provided (roll@tenant)
        if not email:
            email = f"{roll.lower()}@{tenant.slug}.ceap"

        # Use roll number as default password if none provided
        if not pwd:
            pwd = roll  # admin should inform students their default password = roll number

        # Skip if email already exists in this tenant
        existing = await db.execute(
            select(User).where(User.tenant_id == admin.tenant_id, User.email == email)
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        # Also skip if roll number already registered
        roll_existing = await db.execute(
            select(User).where(User.tenant_id == admin.tenant_id, User.roll_number == roll)
        )
        if roll_existing.scalar_one_or_none():
            skipped += 1
            continue

        try:
            user = User(
                tenant_id=admin.tenant_id,
                email=email,
                password_hash=hash_password(pwd),
                full_name=name or roll,
                role="student",
                status="active",
                roll_number=roll,
            )
            db.add(user)
            inserted += 1
        except Exception as e:
            errors.append(f"Row {i} ({roll}): {str(e)}")

    await db.flush()
    return {
        "message": "Import complete — students can now login directly",
        "inserted": inserted,
        "skipped_duplicates": skipped,
        "errors": errors,
        "note": "Default password = roll number if no password column in CSV",
    }


@router.delete("/students/{user_id}")
async def remove_student(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Deactivate a student account."""
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.tenant_id == admin.tenant_id,
            User.role == "student"
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")
    user.is_active = False
    user.status = "suspended"
    await db.flush()
    return {"message": f"Student {user.roll_number} deactivated"}
