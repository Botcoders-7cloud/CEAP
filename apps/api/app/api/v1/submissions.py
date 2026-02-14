"""
CEAP API — Submissions & Problems Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from datetime import datetime
import asyncio

from app.database import get_db
from app.models.tenant import User
from app.models.problem import (
    Problem, TestCase, StarterCode, EventProblem,
    Submission, SubmissionResult
)
from app.models.event import Event, Registration
from app.models.leaderboard import LeaderboardEntry
from app.schemas.submission import (
    ProblemCreate, ProblemUpdate, ProblemResponse,
    TestCaseCreate, TestCaseResponse,
    SubmissionCreate, SubmissionResponse, SubmissionDetailResponse,
    SubmissionResultResponse,
)
from app.core.security import get_current_user, require_faculty
from app.services.judge_service import judge_service

router = APIRouter(tags=["Problems & Submissions"])


# ── Problems ────────────────────────────────────────────────

@router.get("/problems", response_model=list[ProblemResponse])
async def list_problems(
    difficulty: str = Query(None),
    problem_type: str = Query(None),
    tag: str = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List problems for the current tenant."""
    query = select(Problem).where(Problem.tenant_id == user.tenant_id)

    if difficulty:
        query = query.where(Problem.difficulty == difficulty)
    if problem_type:
        query = query.where(Problem.problem_type == problem_type)
    if tag:
        query = query.where(Problem.tags.contains([tag]))

    result = await db.execute(query.order_by(Problem.created_at.desc()))
    return [ProblemResponse.model_validate(p) for p in result.scalars().all()]


@router.post("/problems", response_model=ProblemResponse, status_code=201)
async def create_problem(
    req: ProblemCreate,
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
):
    """Create a new problem (faculty+)."""
    problem = Problem(
        tenant_id=user.tenant_id,
        created_by=user.id,
        **req.model_dump(),
    )
    db.add(problem)
    await db.flush()
    await db.refresh(problem)
    return ProblemResponse.model_validate(problem)


@router.get("/problems/{problem_id}", response_model=ProblemResponse)
async def get_problem(
    problem_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get problem details."""
    result = await db.execute(
        select(Problem).where(Problem.id == problem_id, Problem.tenant_id == user.tenant_id)
    )
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return ProblemResponse.model_validate(problem)


@router.post("/problems/{problem_id}/test-cases", response_model=TestCaseResponse, status_code=201)
async def add_test_case(
    problem_id: UUID,
    req: TestCaseCreate,
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
):
    """Add a test case to a problem (faculty+)."""
    problem = (await db.execute(
        select(Problem).where(Problem.id == problem_id, Problem.tenant_id == user.tenant_id)
    )).scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    tc = TestCase(
        problem_id=problem_id,
        input=req.input,
        expected_output=req.expected_output,
        is_sample=req.is_sample,
        weight=req.weight,
    )
    db.add(tc)
    await db.flush()
    await db.refresh(tc)
    return TestCaseResponse.model_validate(tc)


@router.get("/problems/{problem_id}/test-cases", response_model=list[TestCaseResponse])
async def list_test_cases(
    problem_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List test cases (students only see sample test cases)."""
    query = select(TestCase).where(TestCase.problem_id == problem_id)
    if user.role == "student":
        query = query.where(TestCase.is_sample == True)

    result = await db.execute(query.order_by(TestCase.order_index))
    return [TestCaseResponse.model_validate(tc) for tc in result.scalars().all()]


# ── Submissions ─────────────────────────────────────────────

@router.post("/submissions", response_model=SubmissionResponse, status_code=201)
async def create_submission(
    req: SubmissionCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a solution for a problem."""
    # Verify event access
    event = (await db.execute(select(Event).where(Event.id == req.event_id))).scalar_one_or_none()
    if not event or event.tenant_id != user.tenant_id:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.status != "ongoing":
        raise HTTPException(status_code=400, detail="Event is not active")

    # Verify registration
    reg = (await db.execute(
        select(Registration).where(
            Registration.event_id == req.event_id,
            Registration.user_id == user.id,
            Registration.status == "approved",
        )
    )).scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=403, detail="Not registered for this event")

    # Verify problem is in event
    ep = (await db.execute(
        select(EventProblem).where(
            EventProblem.event_id == req.event_id,
            EventProblem.problem_id == req.problem_id,
        )
    )).scalar_one_or_none()
    if not ep:
        raise HTTPException(status_code=404, detail="Problem not in this event")

    # Validate language
    problem = (await db.execute(select(Problem).where(Problem.id == req.problem_id))).scalar_one_or_none()
    if req.language not in problem.allowed_languages:
        raise HTTPException(status_code=400, detail=f"Language '{req.language}' not allowed")

    # Rate limit: max 1 submission per 30 seconds
    recent = (await db.execute(
        select(Submission).where(
            Submission.user_id == user.id,
            Submission.problem_id == req.problem_id,
            Submission.submitted_at > datetime.utcnow().replace(second=datetime.utcnow().second - 30),
        )
    )).scalar_one_or_none()
    if recent:
        raise HTTPException(status_code=429, detail="Please wait 30 seconds between submissions")

    # Create submission
    submission = Submission(
        event_id=req.event_id,
        problem_id=req.problem_id,
        user_id=user.id,
        team_id=reg.team_id,
        language=req.language,
        source_code=req.source_code,
        status="queued",
    )
    db.add(submission)
    await db.flush()
    await db.refresh(submission)

    # Process in background
    background_tasks.add_task(
        process_submission, str(submission.id), str(problem.id)
    )

    return SubmissionResponse.model_validate(submission)


async def process_submission(submission_id: str, problem_id: str):
    """Background task: submit code to Judge0 and process results."""
    from app.database import async_session

    async with async_session() as db:
        try:
            # Get submission and test cases
            sub = (await db.execute(
                select(Submission).where(Submission.id == submission_id)
            )).scalar_one()

            test_cases = (await db.execute(
                select(TestCase).where(TestCase.problem_id == problem_id).order_by(TestCase.order_index)
            )).scalars().all()

            if not test_cases:
                sub.status = "accepted"
                sub.score = 100
                sub.judged_at = datetime.utcnow()
                await db.commit()
                return

            # Get problem limits
            problem = (await db.execute(
                select(Problem).where(Problem.id == problem_id)
            )).scalar_one()

            # Submit each test case to Judge0
            total_weight = sum(tc.weight for tc in test_cases)
            total_score = 0
            max_time = 0
            max_memory = 0
            all_passed = True
            final_status = "accepted"

            for tc in test_cases:
                try:
                    # Submit to Judge0
                    result = await judge_service.submit(
                        source_code=sub.source_code,
                        language=sub.language,
                        stdin=tc.input,
                        expected_output=tc.expected_output,
                        time_limit=problem.time_limit_ms / 1000.0,
                        memory_limit=problem.memory_limit_kb,
                    )

                    token = result.get("token")
                    if not token:
                        continue

                    # Poll for result (max 30 seconds)
                    judge_result = None
                    for _ in range(15):
                        await asyncio.sleep(2)
                        judge_result = await judge_service.get_result(token)
                        status_id = judge_result.get("status", {}).get("id", 0)
                        if status_id >= 3:  # Finished
                            break

                    if not judge_result:
                        continue

                    status_id = judge_result.get("status", {}).get("id", 0)
                    tc_status = judge_service.parse_status(status_id)
                    tc_passed = status_id == 3  # Accepted
                    tc_time = int(float(judge_result.get("time", 0) or 0) * 1000)
                    tc_memory = int(float(judge_result.get("memory", 0) or 0))

                    if not tc_passed:
                        all_passed = False
                        if final_status == "accepted":
                            final_status = tc_status

                    max_time = max(max_time, tc_time)
                    max_memory = max(max_memory, tc_memory)

                    if tc_passed:
                        total_score += (tc.weight / total_weight) * 100

                    # Save test case result
                    result_entry = SubmissionResult(
                        submission_id=sub.id,
                        test_case_id=tc.id,
                        status=tc_status,
                        actual_output=judge_result.get("stdout", ""),
                        execution_time=tc_time,
                        memory_used=tc_memory,
                        passed=tc_passed,
                    )
                    db.add(result_entry)

                except Exception as e:
                    # Log error but continue with other test cases
                    result_entry = SubmissionResult(
                        submission_id=sub.id,
                        test_case_id=tc.id,
                        status="runtime_error",
                        actual_output=str(e),
                        passed=False,
                    )
                    db.add(result_entry)
                    all_passed = False
                    if final_status == "accepted":
                        final_status = "runtime_error"

            # Update submission
            sub.status = final_status
            sub.score = round(total_score, 2)
            sub.execution_time = max_time
            sub.memory_used = max_memory
            sub.judged_at = datetime.utcnow()

            # Update leaderboard
            await update_leaderboard(db, sub)

            await db.commit()

        except Exception as e:
            await db.rollback()
            # Mark submission as error
            async with async_session() as error_db:
                sub = (await error_db.execute(
                    select(Submission).where(Submission.id == submission_id)
                )).scalar_one()
                sub.status = "runtime_error"
                sub.judged_at = datetime.utcnow()
                await error_db.commit()


async def update_leaderboard(db: AsyncSession, submission: Submission):
    """Update leaderboard entry after a submission is judged."""
    participant_id = submission.team_id or submission.user_id

    # Get or create leaderboard entry
    entry = (await db.execute(
        select(LeaderboardEntry).where(
            LeaderboardEntry.event_id == submission.event_id,
            (LeaderboardEntry.team_id == participant_id) if submission.team_id
            else (LeaderboardEntry.user_id == participant_id),
        )
    )).scalar_one_or_none()

    if not entry:
        entry = LeaderboardEntry(
            event_id=submission.event_id,
            user_id=None if submission.team_id else submission.user_id,
            team_id=submission.team_id,
        )
        db.add(entry)

    # Recalculate: best score per problem
    all_subs = (await db.execute(
        select(Submission).where(
            Submission.event_id == submission.event_id,
            Submission.user_id == submission.user_id,
            Submission.status != "pending",
            Submission.status != "queued",
            Submission.status != "running",
        )
    )).scalars().all()

    # Group by problem, take best score
    best_scores = {}
    for s in all_subs:
        pid = str(s.problem_id)
        if pid not in best_scores or float(s.score or 0) > float(best_scores[pid]):
            best_scores[pid] = float(s.score or 0)

    entry.total_score = sum(best_scores.values())
    entry.problems_solved = sum(1 for s in best_scores.values() if s >= 100)
    entry.last_submission = submission.submitted_at


@router.get("/submissions/{submission_id}", response_model=SubmissionDetailResponse)
async def get_submission(
    submission_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get submission details with test case results."""
    sub = (await db.execute(
        select(Submission).where(Submission.id == submission_id)
    )).scalar_one_or_none()

    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Only owners, faculty, or admin can view
    if user.role == "student" and sub.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get results
    results = (await db.execute(
        select(SubmissionResult).where(SubmissionResult.submission_id == submission_id)
    )).scalars().all()

    response = SubmissionDetailResponse.model_validate(sub)
    response.results = [SubmissionResultResponse.model_validate(r) for r in results]
    return response


@router.get("/events/{event_id}/my-submissions", response_model=list[SubmissionResponse])
async def my_submissions(
    event_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List current user's submissions for an event."""
    result = await db.execute(
        select(Submission).where(
            Submission.event_id == event_id,
            Submission.user_id == user.id,
        ).order_by(Submission.submitted_at.desc())
    )
    return [SubmissionResponse.model_validate(s) for s in result.scalars().all()]


# ── Leaderboard ─────────────────────────────────────────────

@router.get("/events/{event_id}/leaderboard")
async def get_leaderboard(
    event_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get event leaderboard."""
    query = (
        select(LeaderboardEntry)
        .where(LeaderboardEntry.event_id == event_id)
        .order_by(
            LeaderboardEntry.total_score.desc(),
            LeaderboardEntry.problems_solved.desc(),
            LeaderboardEntry.last_submission.asc(),
        )
    )

    total = (await db.execute(
        select(func.count()).select_from(query.subquery())
    )).scalar()

    entries = (await db.execute(
        query.offset((page - 1) * page_size).limit(page_size)
    )).scalars().all()

    # Enrich with user/team names
    result = []
    for i, entry in enumerate(entries):
        user_name = None
        team_name = None
        if entry.user_id:
            from app.models.tenant import User as UserModel
            u = (await db.execute(select(UserModel).where(UserModel.id == entry.user_id))).scalar_one_or_none()
            user_name = u.full_name if u else None
        if entry.team_id:
            from app.models.event import Team
            t = (await db.execute(select(Team).where(Team.id == entry.team_id))).scalar_one_or_none()
            team_name = t.name if t else None

        result.append({
            "rank": (page - 1) * page_size + i + 1,
            "user_id": str(entry.user_id) if entry.user_id else None,
            "team_id": str(entry.team_id) if entry.team_id else None,
            "user_name": user_name,
            "team_name": team_name,
            "total_score": float(entry.total_score),
            "problems_solved": entry.problems_solved,
            "total_time": entry.total_time,
            "last_submission": entry.last_submission.isoformat() if entry.last_submission else None,
        })

    return {
        "entries": result,
        "total": total,
        "updated_at": datetime.utcnow().isoformat(),
    }
