"""
CEAP — Event Scheduler Service
Auto-transitions event statuses and generates certificates on completion.
Runs as a background task on app startup.
"""
import asyncio
from datetime import datetime
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.event import Event, Registration
from app.models.leaderboard import LeaderboardEntry, Certificate


async def check_event_transitions():
    """
    Check and auto-transition event statuses:
    - published → ongoing   (when event_start has passed)
    - ongoing  → completed  (when event_end has passed, then auto-generate certs)
    """
    async with async_session() as db:
        now = datetime.utcnow()

        # ── Published → Ongoing ──
        result = await db.execute(
            select(Event).where(
                Event.status == "published",
                Event.event_start != None,
                Event.event_start <= now,
            )
        )
        for event in result.scalars().all():
            event.status = "ongoing"
            print(f"📢 Event '{event.title}' auto-started → ongoing")

        # ── Ongoing → Completed ──
        result = await db.execute(
            select(Event).where(
                Event.status == "ongoing",
                Event.event_end != None,
                Event.event_end <= now,
            )
        )
        completed_events = result.scalars().all()
        for event in completed_events:
            event.status = "completed"
            print(f"✅ Event '{event.title}' auto-completed")

        await db.commit()

        # ── Auto-generate certificates for completed events ──
        for event in completed_events:
            await auto_generate_certificates(db, event)


async def auto_generate_certificates(db: AsyncSession, event: Event):
    """Generate certificates for all participants of a completed event."""
    try:
        # Get approved registrations
        regs = (await db.execute(
            select(Registration).where(
                Registration.event_id == event.id,
                Registration.status == "approved",
            )
        )).scalars().all()

        if not regs:
            return

        # Check existing certs
        existing = (await db.execute(
            select(Certificate).where(Certificate.event_id == event.id)
        )).scalars().all()
        existing_user_ids = {str(c.user_id) for c in existing}

        # Get leaderboard for ranking
        leaderboard = (await db.execute(
            select(LeaderboardEntry)
            .where(LeaderboardEntry.event_id == event.id)
            .order_by(LeaderboardEntry.total_score.desc())
        )).scalars().all()

        rank_map = {}
        for i, entry in enumerate(leaderboard):
            uid = str(entry.user_id) if entry.user_id else None
            if uid:
                rank_map[uid] = {"rank": i + 1, "score": float(entry.total_score)}

        created = 0
        for reg in regs:
            uid = str(reg.user_id)
            if uid in existing_user_ids:
                continue

            info = rank_map.get(uid, {"rank": None, "score": 0})
            cert_type = "participation"
            if info["rank"] == 1:
                cert_type = "winner"
            elif info["rank"] in (2, 3):
                cert_type = "runner_up"

            cert = Certificate(
                event_id=event.id,
                user_id=reg.user_id,
                certificate_type=cert_type,
                rank=info["rank"],
                score=info["score"],
            )
            db.add(cert)
            created += 1

        if created:
            await db.commit()
            print(f"🏆 Auto-generated {created} certificates for '{event.title}'")

    except Exception as e:
        print(f"⚠️ Certificate generation failed for '{event.title}': {e}")


async def run_scheduler():
    """Run the scheduler loop — checks every 5 minutes."""
    print("⏰ Event scheduler started")
    while True:
        try:
            await check_event_transitions()
        except Exception as e:
            print(f"⚠️ Scheduler error (non-fatal): {e}")
        await asyncio.sleep(300)  # 5 minutes
