"""
CEAP API — Certificates Routes
Fetch user-specific certificates based on their actual event participation.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List

from app.database import get_db
from app.models.tenant import User
from app.models.event import Event, Registration
from app.models.leaderboard import Certificate, LeaderboardEntry
from app.core.security import get_current_user

router = APIRouter(tags=["Certificates"])


class CertificateResponse(BaseModel):
    id: str
    event_id: str
    event_title: str
    certificate_type: Optional[str] = None
    rank: Optional[int] = None
    score: Optional[float] = None
    verification_id: str
    issued_at: datetime
    downloaded_at: Optional[datetime] = None


@router.get("/certificates/my", response_model=List[CertificateResponse])
async def my_certificates(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all certificates for the logged-in user."""
    result = await db.execute(
        select(Certificate, Event.title)
        .join(Event, Event.id == Certificate.event_id)
        .where(Certificate.user_id == user.id)
        .order_by(Certificate.issued_at.desc())
    )

    certs = []
    for cert, event_title in result.all():
        certs.append(CertificateResponse(
            id=str(cert.id),
            event_id=str(cert.event_id),
            event_title=event_title,
            certificate_type=cert.certificate_type,
            rank=cert.rank,
            score=float(cert.score) if cert.score else None,
            verification_id=cert.verification_id,
            issued_at=cert.issued_at,
            downloaded_at=cert.downloaded_at,
        ))

    return certs


@router.post("/certificates/{cert_id}/downloaded")
async def mark_downloaded(
    cert_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a certificate as downloaded."""
    cert = (await db.execute(
        select(Certificate).where(
            Certificate.id == cert_id,
            Certificate.user_id == user.id,
        )
    )).scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    cert.downloaded_at = datetime.utcnow()
    await db.commit()
    return {"status": "ok"}


@router.get("/certificates/verify/{verification_id}")
async def verify_certificate(
    verification_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — verify a certificate by its verification ID."""
    result = await db.execute(
        select(Certificate, Event.title, User.full_name)
        .join(Event, Event.id == Certificate.event_id)
        .join(User, User.id == Certificate.user_id)
        .where(Certificate.verification_id == verification_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Certificate not found")

    cert, event_title, user_name = row
    return {
        "valid": True,
        "user_name": user_name,
        "event_title": event_title,
        "certificate_type": cert.certificate_type,
        "rank": cert.rank,
        "score": float(cert.score) if cert.score else None,
        "issued_at": cert.issued_at.isoformat(),
        "verification_id": cert.verification_id,
    }


@router.post("/events/{event_id}/generate-certificates")
async def generate_certificates_for_event(
    event_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Faculty/admin: Generate certificates for all participants of a completed event."""
    if user.role not in ("admin", "faculty"):
        raise HTTPException(status_code=403, detail="Only faculty/admin can generate certificates")

    event = (await db.execute(select(Event).where(Event.id == event_id))).scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Get all approved registrations for this event
    regs = (await db.execute(
        select(Registration).where(
            Registration.event_id == event_id,
            Registration.status == "approved",
        )
    )).scalars().all()

    if not regs:
        raise HTTPException(status_code=400, detail="No approved registrations for this event")

    # Check if certificates already exist
    existing = (await db.execute(
        select(Certificate).where(Certificate.event_id == event_id)
    )).scalars().all()
    existing_user_ids = {str(c.user_id) for c in existing}

    # Get leaderboard for ranking
    leaderboard = (await db.execute(
        select(LeaderboardEntry)
        .where(LeaderboardEntry.event_id == event_id)
        .order_by(LeaderboardEntry.total_score.desc())
    )).scalars().all()

    # Build a score/rank map
    rank_map = {}
    for i, entry in enumerate(leaderboard):
        uid = str(entry.user_id) if entry.user_id else None
        if uid:
            rank_map[uid] = {
                "rank": i + 1,
                "score": float(entry.total_score),
            }

    created = 0
    for reg in regs:
        uid = str(reg.user_id)
        if uid in existing_user_ids:
            continue  # Already has a certificate

        info = rank_map.get(uid, {"rank": None, "score": 0})

        # Determine certificate type
        cert_type = "participation"
        if info["rank"] == 1:
            cert_type = "winner"
        elif info["rank"] == 2:
            cert_type = "runner_up"
        elif info["rank"] == 3:
            cert_type = "runner_up"

        cert = Certificate(
            event_id=event_id,
            user_id=reg.user_id,
            certificate_type=cert_type,
            rank=info["rank"],
            score=info["score"],
        )
        db.add(cert)
        created += 1

    await db.commit()
    return {"created": created, "total": len(regs), "already_existed": len(existing_user_ids)}
