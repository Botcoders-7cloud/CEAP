"""
CEAP API — Analytics Routes
Real-time platform analytics from database.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.tenant import User
from app.models.event import Event, Registration
from app.models.problem import Submission
from app.models.leaderboard import Certificate
from app.core.security import get_current_user, require_faculty

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard")
async def dashboard_analytics(
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
):
    """Return real platform analytics. Requires faculty/admin role."""
    tenant_id = user.tenant_id

    # ── Event counts ──────────────────────────────
    events_result = await db.execute(
        select(Event).where(Event.tenant_id == tenant_id)
    )
    events = events_result.scalars().all()
    total_events = len(events)
    events_by_type = {}
    events_by_status = {}
    for e in events:
        events_by_type[e.event_type] = events_by_type.get(e.event_type, 0) + 1
        events_by_status[e.status] = events_by_status.get(e.status, 0) + 1

    # ── User counts ───────────────────────────────
    users_result = await db.execute(
        select(User).where(User.tenant_id == tenant_id)
    )
    users = users_result.scalars().all()
    total_users = len(users)
    users_by_role = {}
    for u in users:
        users_by_role[u.role] = users_by_role.get(u.role, 0) + 1

    # ── Submission counts ─────────────────────────
    subs_result = await db.execute(
        select(Submission).where(Submission.event_id.in_(
            select(Event.id).where(Event.tenant_id == tenant_id)
        ))
    )
    submissions = subs_result.scalars().all()
    total_submissions = len(submissions)
    subs_by_verdict = {}
    for s in submissions:
        verdict = s.status or "unknown"
        subs_by_verdict[verdict] = subs_by_verdict.get(verdict, 0) + 1

    # ── Certificate counts ────────────────────────
    certs_result = await db.execute(
        select(Certificate).where(Certificate.event_id.in_(
            select(Event.id).where(Event.tenant_id == tenant_id)
        ))
    )
    total_certificates = len(certs_result.scalars().all())

    # ── Registration counts ───────────────────────
    regs_result = await db.execute(
        select(Registration).where(Registration.event_id.in_(
            select(Event.id).where(Event.tenant_id == tenant_id)
        ))
    )
    total_registrations = len(regs_result.scalars().all())

    # ── Recent activity (last 10 events/registrations) ─
    recent = []
    for e in sorted(events, key=lambda x: x.created_at, reverse=True)[:5]:
        recent.append({
            "action": f"Event \"{e.title}\" created ({e.event_type})",
            "time": e.created_at.isoformat(),
            "type": "event",
        })

    return {
        "stats": {
            "total_events": total_events,
            "total_users": total_users,
            "total_submissions": total_submissions,
            "total_certificates": total_certificates,
            "total_registrations": total_registrations,
        },
        "events_by_type": events_by_type,
        "events_by_status": events_by_status,
        "users_by_role": users_by_role,
        "submissions_by_verdict": subs_by_verdict,
        "recent_activity": recent,
    }
