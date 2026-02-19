"""
CEAP API — Submissions & Problems Routes
Fixed: SubmissionDetailResponse validation, rate-limit datetime,
       added Run endpoint, proper error capture.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, func
from uuid import UUID
from datetime import datetime, timedelta
import asyncio
import json

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
    RunRequest, RunResponse, RunResult,
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


# ── Run (test against sample cases, no grading) ─────────────

@router.post("/submissions/run", response_model=RunResponse)
async def run_code(
    req: RunRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Run code against sample test cases only.
    Returns stdout/stderr immediately — no DB save, no leaderboard.
    """
    # Rate limit: max 1 run per 5 seconds
    # (lightweight — just use in-memory or skip for now)

    # Get problem
    problem = (await db.execute(
        select(Problem).where(Problem.id == req.problem_id)
    )).scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    # Validate language
    if req.language not in (problem.allowed_languages or []):
        raise HTTPException(status_code=400, detail=f"Language '{req.language}' not allowed")

    # If custom input provided, run with that (no expected output)
    if req.custom_input is not None:
        result = await judge_service.execute(
            source_code=req.source_code,
            language=req.language,
            stdin=req.custom_input,
            expected_output=None,
            time_limit=problem.time_limit_ms / 1000.0,
            memory_limit=problem.memory_limit_kb,
        )
        return RunResponse(
            status=result["status"],
            stdout=result["stdout"],
            stderr=result["stderr"],
            compile_output=result["compile_output"],
            execution_time=result["time"],
            memory_used=result["memory"],
            passed_count=1 if result["passed"] else 0,
            total_count=1,
            test_results=[RunResult(
                test_case_index=0,
                input=req.custom_input,
                stdout=result["stdout"],
                stderr=result["stderr"],
                compile_output=result["compile_output"],
                status=result["status"],
                passed=result["passed"],
                execution_time=result["time"],
                memory_used=result["memory"],
            )],
        )

    # Get sample test cases
    sample_cases = (await db.execute(
        select(TestCase).where(
            TestCase.problem_id == req.problem_id,
            TestCase.is_sample == True,
        ).order_by(TestCase.order_index)
    )).scalars().all()

    if not sample_cases:
        # No sample cases — just run with problem's sample_input
        stdin = problem.sample_input or ""
        result = await judge_service.execute(
            source_code=req.source_code,
            language=req.language,
            stdin=stdin,
            expected_output=problem.sample_output,
            time_limit=problem.time_limit_ms / 1000.0,
            memory_limit=problem.memory_limit_kb,
        )
        return RunResponse(
            status=result["status"],
            stdout=result["stdout"],
            stderr=result["stderr"],
            compile_output=result["compile_output"],
            execution_time=result["time"],
            memory_used=result["memory"],
            passed_count=1 if result["passed"] else 0,
            total_count=1,
            test_results=[RunResult(
                test_case_index=0,
                input=stdin,
                expected_output=problem.sample_output,
                stdout=result["stdout"],
                stderr=result["stderr"],
                compile_output=result["compile_output"],
                status=result["status"],
                passed=result["passed"],
                execution_time=result["time"],
                memory_used=result["memory"],
            )],
        )

    # Run against each sample test case
    test_results = []
    overall_status = "accepted"
    passed_count = 0
    max_time = 0
    max_memory = 0

    for i, tc in enumerate(sample_cases):
        result = await judge_service.execute(
            source_code=req.source_code,
            language=req.language,
            stdin=tc.input,
            expected_output=tc.expected_output,
            time_limit=problem.time_limit_ms / 1000.0,
            memory_limit=problem.memory_limit_kb,
        )

        if result["passed"]:
            passed_count += 1
        elif overall_status == "accepted":
            overall_status = result["status"]

        max_time = max(max_time, result["time"])
        max_memory = max(max_memory, result["memory"])

        # For compile errors, stop early
        if result["status"] == "compile_error":
            overall_status = "compile_error"
            test_results.append(RunResult(
                test_case_index=i,
                input=tc.input,
                expected_output=tc.expected_output,
                stdout=result["stdout"],
                stderr=result["stderr"],
                compile_output=result["compile_output"],
                status=result["status"],
                passed=False,
                execution_time=0,
                memory_used=0,
            ))
            break

        test_results.append(RunResult(
            test_case_index=i,
            input=tc.input,
            expected_output=tc.expected_output,
            stdout=result["stdout"],
            stderr=result["stderr"],
            compile_output=result["compile_output"],
            status=result["status"],
            passed=result["passed"],
            execution_time=result["time"],
            memory_used=result["memory"],
        ))

    return RunResponse(
        status=overall_status,
        stdout=test_results[0].stdout if test_results else "",
        stderr=test_results[0].stderr if test_results else "",
        compile_output=test_results[0].compile_output if test_results else "",
        execution_time=max_time,
        memory_used=max_memory,
        passed_count=passed_count,
        total_count=len(sample_cases),
        test_results=test_results,
    )


# ── Submissions (full grading) ──────────────────────────────

@router.post("/submissions", response_model=SubmissionResponse, status_code=201)
async def create_submission(
    req: SubmissionCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a solution for a problem (full grading)."""
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
    if req.language not in (problem.allowed_languages or []):
        raise HTTPException(status_code=400, detail=f"Language '{req.language}' not allowed")

    # Rate limit: max 1 submission per 30 seconds (FIXED — was crashing)
    cutoff = datetime.utcnow() - timedelta(seconds=30)
    recent = (await db.execute(
        select(Submission).where(
            Submission.user_id == user.id,
            Submission.problem_id == req.problem_id,
            Submission.submitted_at > cutoff,
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
    """Background task: execute code and process results."""
    from app.database import async_session

    async with async_session() as db:
        try:
            sub = (await db.execute(
                select(Submission).where(Submission.id == submission_id)
            )).scalar_one()

            test_cases = (await db.execute(
                select(TestCase).where(TestCase.problem_id == problem_id)
                .order_by(TestCase.order_index)
            )).scalars().all()

            if not test_cases:
                sub.status = "accepted"
                sub.score = 100
                sub.judged_at = datetime.utcnow()
                await db.commit()
                return

            problem = (await db.execute(
                select(Problem).where(Problem.id == problem_id)
            )).scalar_one()

            total_weight = sum(tc.weight for tc in test_cases)
            total_score = 0
            max_time = 0
            max_memory = 0
            final_status = "accepted"

            for tc in test_cases:
                try:
                    result = await judge_service.execute(
                        source_code=sub.source_code,
                        language=sub.language,
                        stdin=tc.input,
                        expected_output=tc.expected_output,
                        time_limit=problem.time_limit_ms / 1000.0,
                        memory_limit=problem.memory_limit_kb,
                    )

                    tc_passed = result["passed"]
                    tc_status = result["status"]
                    tc_time = result["time"]
                    tc_memory = result["memory"]

                    if not tc_passed and final_status == "accepted":
                        final_status = tc_status

                    max_time = max(max_time, tc_time)
                    max_memory = max(max_memory, tc_memory)

                    if tc_passed:
                        total_score += (tc.weight / total_weight) * 100

                    # Build combined output for actual_output field
                    # Store stderr and compile_output as JSON in actual_output
                    output_data = result["stdout"]
                    if result["stderr"] or result["compile_output"]:
                        output_data = json.dumps({
                            "stdout": result["stdout"],
                            "stderr": result["stderr"],
                            "compile_output": result["compile_output"],
                        })

                    result_entry = SubmissionResult(
                        submission_id=sub.id,
                        test_case_id=tc.id,
                        status=tc_status,
                        actual_output=output_data,
                        execution_time=tc_time,
                        memory_used=tc_memory,
                        passed=tc_passed,
                    )
                    db.add(result_entry)

                    # Stop early on compile error (same code for all cases)
                    if tc_status == "compile_error":
                        final_status = "compile_error"
                        break

                except Exception as e:
                    result_entry = SubmissionResult(
                        submission_id=sub.id,
                        test_case_id=tc.id,
                        status="runtime_error",
                        actual_output=str(e),
                        passed=False,
                    )
                    db.add(result_entry)
                    if final_status == "accepted":
                        final_status = "runtime_error"

            sub.status = final_status
            sub.score = round(total_score, 2)
            sub.execution_time = max_time
            sub.memory_used = max_memory
            sub.judged_at = datetime.utcnow()

            await update_leaderboard(db, sub)
            await db.commit()

        except Exception as e:
            await db.rollback()
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

    all_subs = (await db.execute(
        select(Submission).where(
            Submission.event_id == submission.event_id,
            Submission.user_id == submission.user_id,
            Submission.status != "pending",
            Submission.status != "queued",
            Submission.status != "running",
        )
    )).scalars().all()

    best_scores = {}
    for s in all_subs:
        pid = str(s.problem_id)
        if pid not in best_scores or float(s.score or 0) > float(best_scores[pid]):
            best_scores[pid] = float(s.score or 0)

    entry.total_score = sum(best_scores.values())
    entry.problems_solved = sum(1 for s in best_scores.values() if s >= 100)
    entry.last_submission = submission.submitted_at


# ── Get Submission Details (FIXED — no lazy loading) ─────────

@router.get("/submissions/{submission_id}", response_model=SubmissionDetailResponse)
async def get_submission(
    submission_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get submission details with test case results."""
    # FIXED: use selectinload to eagerly load results — prevents MissingGreenlet
    sub = (await db.execute(
        select(Submission)
        .options(selectinload(Submission.results))
        .where(Submission.id == submission_id)
    )).scalar_one_or_none()

    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    if user.role == "student" and sub.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Build response manually to avoid pydantic lazy-load issues
    result_list = []
    for r in sub.results:
        # Parse combined output (may be JSON with stderr/compile_output)
        stderr = None
        compile_output = None
        actual_output = r.actual_output

        if actual_output and actual_output.startswith("{"):
            try:
                parsed = json.loads(actual_output)
                actual_output = parsed.get("stdout", "")
                stderr = parsed.get("stderr", "")
                compile_output = parsed.get("compile_output", "")
            except json.JSONDecodeError:
                pass

        result_list.append(SubmissionResultResponse(
            id=r.id,
            test_case_id=r.test_case_id,
            status=r.status,
            actual_output=actual_output,
            stderr=stderr,
            compile_output=compile_output,
            execution_time=r.execution_time,
            memory_used=r.memory_used,
            passed=r.passed,
        ))

    return SubmissionDetailResponse(
        id=sub.id,
        event_id=sub.event_id,
        problem_id=sub.problem_id,
        user_id=sub.user_id,
        language=sub.language,
        source_code=sub.source_code,
        status=sub.status,
        score=float(sub.score) if sub.score else None,
        execution_time=sub.execution_time,
        memory_used=sub.memory_used,
        submitted_at=sub.submitted_at,
        judged_at=sub.judged_at,
        results=result_list,
    )


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
