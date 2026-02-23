"""
CEAP API — Analytics Routes
Real-time platform analytics, student stats, and export endpoints.
"""
import io
from datetime import datetime
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.database import get_db
from app.models.tenant import User
from app.models.event import Event, Registration
from app.models.problem import Submission
from app.models.leaderboard import Certificate, LeaderboardEntry
from app.models.mcq import MCQAttempt
from app.core.security import get_current_user, require_faculty, require_admin

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

    # ── Recent activity (last 5 events) ──────────
    recent = []
    for e in sorted(events, key=lambda x: x.created_at, reverse=True)[:5]:
        recent.append({
            "action": f'Event "{e.title}" created ({e.event_type})',
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


# ── Student personal stats ───────────────────────────────────
@router.get("/my-stats")
async def my_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return personal stats for the logged-in user (works for any role)."""
    uid = str(user.id)

    # Events registered
    regs = (await db.execute(
        select(Registration).where(Registration.user_id == uid)
    )).scalars().all()
    events_registered = len(regs)

    # Submissions
    subs_count = (await db.execute(
        select(func.count()).select_from(Submission).where(Submission.user_id == uid)
    )).scalar() or 0

    # Best rank
    best_rank_result = (await db.execute(
        select(func.min(LeaderboardEntry.rank))
        .where(LeaderboardEntry.user_id == uid)
        .where(LeaderboardEntry.rank != None)
    )).scalar()
    best_rank = best_rank_result if best_rank_result else None

    # Certificates
    certs = (await db.execute(
        select(Certificate).where(Certificate.user_id == uid)
    )).scalars().all()
    cert_count = len(certs)

    # MCQ exams taken
    mcq_attempts = (await db.execute(
        select(MCQAttempt).where(MCQAttempt.user_id == uid, MCQAttempt.status == "submitted")
    )).scalars().all()
    mcq_count = len(mcq_attempts)
    avg_mcq_score = round(sum(a.score for a in mcq_attempts) / len(mcq_attempts), 1) if mcq_attempts else 0

    # Recent activity
    recent = []
    for reg in sorted(regs, key=lambda r: r.registered_at, reverse=True)[:3]:
        event = (await db.execute(select(Event).where(Event.id == reg.event_id))).scalar_one_or_none()
        if event:
            recent.append({
                "text": f"Registered for {event.title}",
                "time": reg.registered_at.isoformat() if reg.registered_at else "",
                "type": "registration",
            })
    for cert in sorted(certs, key=lambda c: c.issued_at, reverse=True)[:2]:
        event = (await db.execute(select(Event).where(Event.id == cert.event_id))).scalar_one_or_none()
        if event:
            recent.append({
                "text": f"Certificate earned: {event.title}",
                "time": cert.issued_at.isoformat(),
                "type": "certificate",
            })

    recent.sort(key=lambda x: x["time"], reverse=True)

    return {
        "events_registered": events_registered,
        "submissions_count": subs_count,
        "best_rank": best_rank,
        "certificates_count": cert_count,
        "mcq_exams_taken": mcq_count,
        "avg_mcq_score": avg_mcq_score,
        "recent_activity": recent[:5],
    }


# ── Export Leaderboard as CSV ────────────────────────────────
@router.get("/export/leaderboard/{event_id}")
async def export_leaderboard(
    event_id: str,
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
):
    """Download event leaderboard as CSV."""
    import csv

    event = (await db.execute(select(Event).where(Event.id == event_id))).scalar_one_or_none()
    if not event:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Event not found")

    entries = (await db.execute(
        select(LeaderboardEntry, User.full_name, User.email, User.roll_number)
        .join(User, User.id == LeaderboardEntry.user_id)
        .where(LeaderboardEntry.event_id == event_id)
        .order_by(desc(LeaderboardEntry.total_score))
    )).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Rank", "Name", "Email", "Roll Number", "Score", "Problems Solved"])

    for i, (entry, name, email, roll) in enumerate(entries, 1):
        writer.writerow([
            i, name, email, roll or "",
            float(entry.total_score), entry.problems_solved or 0,
        ])

    output.seek(0)
    filename = f"leaderboard_{event.slug or event_id}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ── Export Participants as CSV ───────────────────────────────
@router.get("/export/participants/{event_id}")
async def export_participants(
    event_id: str,
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
):
    """Download event participants list as CSV."""
    import csv

    event = (await db.execute(select(Event).where(Event.id == event_id))).scalar_one_or_none()
    if not event:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Event not found")

    regs = (await db.execute(
        select(Registration, User.full_name, User.email, User.roll_number, User.department)
        .join(User, User.id == Registration.user_id)
        .where(Registration.event_id == event_id)
        .order_by(Registration.registered_at)
    )).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["#", "Name", "Email", "Roll Number", "Department", "Status", "Registered At"])

    for i, (reg, name, email, roll, dept) in enumerate(regs, 1):
        writer.writerow([
            i, name, email, roll or "", dept or "",
            reg.status, reg.registered_at.isoformat() if reg.registered_at else "",
        ])

    output.seek(0)
    filename = f"participants_{event.slug or event_id}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ── Export MCQ Results as CSV ────────────────────────────────
@router.get("/export/mcq-results/{event_id}")
async def export_mcq_results(
    event_id: str,
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
):
    """Download MCQ exam results as CSV."""
    import csv

    event = (await db.execute(select(Event).where(Event.id == event_id))).scalar_one_or_none()
    if not event:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Event not found")

    attempts = (await db.execute(
        select(MCQAttempt, User.full_name, User.email, User.roll_number)
        .join(User, User.id == MCQAttempt.user_id)
        .where(MCQAttempt.event_id == event_id)
        .order_by(desc(MCQAttempt.score))
    )).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Rank", "Name", "Email", "Roll Number",
        "Score", "Max Score", "Correct", "Wrong", "Skipped",
        "Started At", "Submitted At", "Status",
    ])

    for i, (attempt, name, email, roll) in enumerate(attempts, 1):
        writer.writerow([
            i, name, email, roll or "",
            attempt.score, attempt.max_score,
            attempt.correct, attempt.wrong, attempt.skipped,
            attempt.started_at.isoformat() if attempt.started_at else "",
            attempt.submitted_at.isoformat() if attempt.submitted_at else "",
            attempt.status,
        ])

    output.seek(0)
    filename = f"mcq_results_{event.slug or event_id}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
