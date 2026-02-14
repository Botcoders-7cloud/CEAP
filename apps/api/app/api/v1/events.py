"""
CEAP API — Event Routes
CRUD for events, registrations, and teams.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from uuid import UUID
from datetime import datetime
import secrets

from app.database import get_db
from app.models.tenant import User
from app.models.event import Event, Registration, Team, TeamMember
from app.schemas.event import (
    EventCreate, EventUpdate, EventResponse, EventListResponse,
    RegistrationCreate, RegistrationResponse,
    TeamCreate, TeamJoin, TeamResponse,
)
from app.core.security import get_current_user, require_faculty, require_admin

router = APIRouter(prefix="/events", tags=["Events"])


# ── Event CRUD ──────────────────────────────────────────────

@router.get("", response_model=EventListResponse)
async def list_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    event_type: str = Query(None),
    search: str = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List events for the current tenant."""
    query = select(Event).where(Event.tenant_id == user.tenant_id)

    if status:
        query = query.where(Event.status == status)
    if event_type:
        query = query.where(Event.event_type == event_type)
    if search:
        query = query.where(Event.title.ilike(f"%{search}%"))

    # For students, only show published/ongoing events
    if user.role == "student":
        query = query.where(Event.status.in_(["published", "ongoing", "completed"]))

    # Count total
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    # Paginate
    query = query.order_by(Event.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    events = result.scalars().all()

    return EventListResponse(
        events=[EventResponse.model_validate(e) for e in events],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=EventResponse, status_code=201)
async def create_event(
    req: EventCreate,
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
):
    """Create a new event (admin/faculty only)."""
    # Check slug uniqueness
    existing = await db.execute(
        select(Event).where(Event.tenant_id == user.tenant_id, Event.slug == req.slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Event slug already exists")

    event = Event(
        tenant_id=user.tenant_id,
        created_by=user.id,
        **req.model_dump(),
    )
    db.add(event)
    await db.flush()
    await db.refresh(event)
    return EventResponse.model_validate(event)


@router.get("/{event_slug}", response_model=EventResponse)
async def get_event(
    event_slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get event details by slug."""
    result = await db.execute(
        select(Event).where(Event.tenant_id == user.tenant_id, Event.slug == event_slug)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    return EventResponse.model_validate(event)


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: UUID,
    req: EventUpdate,
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
):
    """Update an event (admin/faculty only)."""
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.tenant_id == user.tenant_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    event.updated_at = datetime.utcnow()

    await db.flush()
    await db.refresh(event)
    return EventResponse.model_validate(event)


@router.post("/{event_id}/publish", response_model=EventResponse)
async def publish_event(
    event_id: UUID,
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
):
    """Publish an event."""
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.tenant_id == user.tenant_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft events can be published")

    event.status = "published"
    event.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(event)
    return EventResponse.model_validate(event)


@router.delete("/{event_id}", status_code=204)
async def archive_event(
    event_id: UUID,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Archive an event (admin only)."""
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.tenant_id == user.tenant_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event.status = "archived"
    await db.flush()


# ── Registrations ───────────────────────────────────────────

@router.post("/{event_id}/register", response_model=RegistrationResponse, status_code=201)
async def register_for_event(
    event_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register current user for an event."""
    # Get event
    event = (await db.execute(select(Event).where(Event.id == event_id))).scalar_one_or_none()
    if not event or event.tenant_id != user.tenant_id:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.status not in ["published", "ongoing"]:
        raise HTTPException(status_code=400, detail="Registration not open")

    # Check registration window
    now = datetime.utcnow()
    if event.registration_end and now > event.registration_end:
        raise HTTPException(status_code=400, detail="Registration window closed")

    # Check duplicate
    existing = await db.execute(
        select(Registration).where(
            Registration.event_id == event_id,
            Registration.user_id == user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already registered")

    # Check capacity
    if event.max_participants:
        count = (await db.execute(
            select(func.count()).where(
                Registration.event_id == event_id,
                Registration.status.in_(["pending", "approved"])
            )
        )).scalar()
        if count >= event.max_participants:
            raise HTTPException(status_code=403, detail="Event is full")

    reg = Registration(
        event_id=event_id,
        user_id=user.id,
        status="approved",  # Auto-approve for MVP
    )
    db.add(reg)
    await db.flush()
    await db.refresh(reg)
    return RegistrationResponse.model_validate(reg)


@router.get("/{event_id}/registrations", response_model=list[RegistrationResponse])
async def list_registrations(
    event_id: UUID,
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
):
    """List registrations for an event (faculty+)."""
    result = await db.execute(
        select(Registration).where(Registration.event_id == event_id)
    )
    return [RegistrationResponse.model_validate(r) for r in result.scalars().all()]


# ── Teams ───────────────────────────────────────────────────

@router.post("/{event_id}/teams", response_model=TeamResponse, status_code=201)
async def create_team(
    event_id: UUID,
    req: TeamCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a team for an event."""
    event = (await db.execute(select(Event).where(Event.id == event_id))).scalar_one_or_none()
    if not event or not event.is_team_event:
        raise HTTPException(status_code=400, detail="Not a team event")

    team = Team(
        event_id=event_id,
        name=req.name,
        leader_id=user.id,
    )
    db.add(team)
    await db.flush()

    # Add leader as member
    member = TeamMember(team_id=team.id, user_id=user.id, role="leader")
    db.add(member)
    await db.flush()
    await db.refresh(team)

    return TeamResponse(
        id=team.id,
        event_id=team.event_id,
        name=team.name,
        invite_code=team.invite_code,
        leader_id=team.leader_id,
        is_locked=team.is_locked,
        member_count=1,
    )


@router.post("/teams/join", response_model=TeamResponse)
async def join_team(
    req: TeamJoin,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Join a team via invite code."""
    team = (await db.execute(
        select(Team).where(Team.invite_code == req.invite_code)
    )).scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if team.is_locked:
        raise HTTPException(status_code=400, detail="Team is locked")

    # Check team size
    event = (await db.execute(select(Event).where(Event.id == team.event_id))).scalar_one_or_none()
    member_count = (await db.execute(
        select(func.count()).where(TeamMember.team_id == team.id)
    )).scalar()

    if member_count >= event.team_max_size:
        raise HTTPException(status_code=400, detail="Team is full")

    # Check already a member
    existing = await db.execute(
        select(TeamMember).where(TeamMember.team_id == team.id, TeamMember.user_id == user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already a team member")

    member = TeamMember(team_id=team.id, user_id=user.id, role="member")
    db.add(member)
    await db.flush()

    return TeamResponse(
        id=team.id,
        event_id=team.event_id,
        name=team.name,
        invite_code=team.invite_code,
        leader_id=team.leader_id,
        is_locked=team.is_locked,
        member_count=member_count + 1,
    )
