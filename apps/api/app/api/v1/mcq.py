"""
CEAP API — MCQ Routes
Create/import questions, start exams, submit answers, auto-grade.
"""
import csv
import io
import json
import random
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.tenant import User
from app.models.event import Event
from app.models.mcq import MCQQuestion, MCQAttempt
from app.models.leaderboard import LeaderboardEntry
from app.core.security import get_current_user, require_faculty

router = APIRouter(prefix="/mcq", tags=["MCQ Exams"])


# ── Schemas ──────────────────────────────────────────────────
class QuestionCreate(BaseModel):
    question_text: str = Field(..., min_length=5, max_length=2000)
    option_a: str = Field(..., min_length=1, max_length=500)
    option_b: str = Field(..., min_length=1, max_length=500)
    option_c: str | None = None
    option_d: str | None = None
    correct_option: str = Field(..., pattern=r"^[abcd]$")
    explanation: str | None = None
    marks: float = 1.0
    negative_marks: float = 0.0
    difficulty: str = "medium"
    topic: str | None = None


class AnswerSubmission(BaseModel):
    answers: dict[str, str]  # {"question_id": "a", ...}


# ── Create Question (faculty) ────────────────────────────────
@router.post("/events/{event_id}/questions", status_code=201)
async def create_question(
    event_id: UUID,
    req: QuestionCreate,
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
):
    """Add a single MCQ question to an event."""
    event = (await db.execute(select(Event).where(Event.id == event_id))).scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.event_type != "mcq_exam":
        raise HTTPException(status_code=400, detail="Event is not an MCQ exam")

    # Get next order index
    count = (await db.execute(
        select(func.count()).where(MCQQuestion.event_id == str(event_id))
    )).scalar() or 0

    q = MCQQuestion(
        tenant_id=str(user.tenant_id),
        event_id=str(event_id),
        question_text=req.question_text,
        option_a=req.option_a,
        option_b=req.option_b,
        option_c=req.option_c,
        option_d=req.option_d,
        correct_option=req.correct_option,
        explanation=req.explanation,
        marks=req.marks,
        negative_marks=req.negative_marks,
        difficulty=req.difficulty,
        topic=req.topic,
        order_index=count,
    )
    db.add(q)
    await db.flush()
    return {"id": q.id, "message": "Question added", "order": count + 1}


# ── List Questions (faculty sees answers, students don't) ────
@router.get("/events/{event_id}/questions")
async def list_questions(
    event_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List MCQ questions for an event."""
    result = await db.execute(
        select(MCQQuestion)
        .where(MCQQuestion.event_id == str(event_id))
        .order_by(MCQQuestion.order_index)
    )
    questions = result.scalars().all()

    is_faculty = user.role in ("admin", "faculty", "super_admin")

    return [{
        "id": q.id,
        "question_text": q.question_text,
        "option_a": q.option_a,
        "option_b": q.option_b,
        "option_c": q.option_c,
        "option_d": q.option_d,
        "correct_option": q.correct_option if is_faculty else None,
        "explanation": q.explanation if is_faculty else None,
        "marks": q.marks,
        "negative_marks": q.negative_marks,
        "difficulty": q.difficulty,
        "topic": q.topic,
        "order": q.order_index,
    } for q in questions]


# ── Import Questions from CSV/Excel ──────────────────────────
@router.post("/events/{event_id}/questions/import")
async def import_questions(
    event_id: UUID,
    file: UploadFile = File(...),
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
):
    """
    Import MCQ questions from CSV or Excel file.

    Expected columns:
    - question (required)
    - option_a, option_b, option_c, option_d (a & b required)
    - correct_option or answer (required: a/b/c/d)
    - marks (optional, default 1)
    - negative_marks (optional, default 0)
    - explanation (optional)
    - difficulty (optional: easy/medium/hard)
    - topic (optional)
    """
    event = (await db.execute(select(Event).where(Event.id == event_id))).scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    filename = file.filename or ""
    content = await file.read()

    rows = []

    if filename.endswith(".csv"):
        # CSV parsing
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = content.decode("latin-1")
        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames:
            raise HTTPException(status_code=400, detail="CSV file is empty")
        rows = list(reader)

    elif filename.endswith((".xlsx", ".xls")):
        # Excel parsing
        try:
            import openpyxl
        except ImportError:
            raise HTTPException(status_code=400, detail="Excel support requires openpyxl. Use CSV instead.")

        wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True)
        ws = wb.active
        all_rows = list(ws.iter_rows(values_only=True))
        if len(all_rows) < 2:
            raise HTTPException(status_code=400, detail="Excel file has no data rows")

        headers = [str(h or "").strip().lower().replace(" ", "_") for h in all_rows[0]]
        for row_data in all_rows[1:]:
            row_dict = {}
            for i, val in enumerate(row_data):
                if i < len(headers):
                    row_dict[headers[i]] = str(val) if val is not None else ""
            rows.append(row_dict)
    else:
        raise HTTPException(status_code=400, detail="Supported formats: CSV, XLSX. Got: " + filename)

    # Normalize column names
    def find_col(row, *keys):
        normalized = {k.strip().lower().replace(" ", "_"): k for k in row.keys()}
        for key in keys:
            if key in normalized:
                return (row.get(normalized[key]) or "").strip()
        return ""

    # Get current max order
    current_count = (await db.execute(
        select(func.count()).where(MCQQuestion.event_id == str(event_id))
    )).scalar() or 0

    inserted = 0
    errors = []

    for i, row in enumerate(rows, start=2):
        question_text = find_col(row, "question", "question_text", "q", "questions")
        opt_a = find_col(row, "option_a", "a", "opt_a", "option1", "option_1")
        opt_b = find_col(row, "option_b", "b", "opt_b", "option2", "option_2")
        opt_c = find_col(row, "option_c", "c", "opt_c", "option3", "option_3")
        opt_d = find_col(row, "option_d", "d", "opt_d", "option4", "option_4")
        answer = find_col(row, "correct_option", "answer", "correct", "correct_answer", "ans").lower()
        explanation = find_col(row, "explanation", "explain", "solution")
        marks_str = find_col(row, "marks", "mark", "points", "score")
        neg_str = find_col(row, "negative_marks", "negative", "neg_marks", "penalty")
        difficulty = find_col(row, "difficulty", "level", "diff") or "medium"
        topic = find_col(row, "topic", "subject", "category", "chapter")

        if not question_text:
            errors.append(f"Row {i}: Missing question text")
            continue
        if not opt_a or not opt_b:
            errors.append(f"Row {i}: Need at least option_a and option_b")
            continue
        if answer not in ("a", "b", "c", "d"):
            errors.append(f"Row {i}: Invalid answer '{answer}' — must be a/b/c/d")
            continue

        try:
            marks = float(marks_str) if marks_str else 1.0
        except ValueError:
            marks = 1.0
        try:
            neg = float(neg_str) if neg_str else 0.0
        except ValueError:
            neg = 0.0

        q = MCQQuestion(
            tenant_id=str(user.tenant_id),
            event_id=str(event_id),
            question_text=question_text,
            option_a=opt_a,
            option_b=opt_b,
            option_c=opt_c or None,
            option_d=opt_d or None,
            correct_option=answer,
            explanation=explanation or None,
            marks=marks,
            negative_marks=neg,
            difficulty=difficulty.lower() if difficulty else "medium",
            topic=topic or None,
            order_index=current_count + inserted,
        )
        db.add(q)
        inserted += 1

    await db.flush()

    return {
        "message": f"Import complete",
        "inserted": inserted,
        "errors": errors,
        "total_questions": current_count + inserted,
    }


# ── Delete Question (faculty) ────────────────────────────────
@router.delete("/questions/{question_id}")
async def delete_question(
    question_id: str,
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
):
    """Delete an MCQ question."""
    q = (await db.execute(
        select(MCQQuestion).where(MCQQuestion.id == question_id)
    )).scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    await db.delete(q)
    await db.flush()
    return {"message": "Question deleted"}


# ── Start Exam (student) ─────────────────────────────────────
@router.post("/events/{event_id}/start")
async def start_exam(
    event_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Student starts an MCQ exam. Creates an attempt record."""
    event = (await db.execute(select(Event).where(Event.id == event_id))).scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.event_type != "mcq_exam":
        raise HTTPException(status_code=400, detail="Not an MCQ exam event")
    if event.status not in ("published", "ongoing"):
        raise HTTPException(status_code=400, detail="Exam is not currently active")

    # Check if already attempted
    existing = (await db.execute(
        select(MCQAttempt).where(
            MCQAttempt.user_id == str(user.id),
            MCQAttempt.event_id == str(event_id),
        )
    )).scalar_one_or_none()

    if existing:
        if existing.status == "submitted":
            raise HTTPException(status_code=400, detail="You have already submitted this exam")
        # Return existing attempt
        return {
            "attempt_id": existing.id,
            "status": existing.status,
            "started_at": existing.started_at.isoformat(),
            "message": "Resuming your exam",
        }

    # Count questions
    q_count = (await db.execute(
        select(func.count()).where(MCQQuestion.event_id == str(event_id))
    )).scalar() or 0

    if q_count == 0:
        raise HTTPException(status_code=400, detail="No questions in this exam yet")

    # Get total possible marks
    max_score = (await db.execute(
        select(func.sum(MCQQuestion.marks)).where(MCQQuestion.event_id == str(event_id))
    )).scalar() or 0

    attempt = MCQAttempt(
        user_id=str(user.id),
        event_id=str(event_id),
        total_questions=q_count,
        max_score=float(max_score),
        time_limit_minutes=getattr(event, "time_limit", None),
    )
    db.add(attempt)
    await db.flush()

    return {
        "attempt_id": attempt.id,
        "total_questions": q_count,
        "max_score": float(max_score),
        "time_limit_minutes": attempt.time_limit_minutes,
        "started_at": attempt.started_at.isoformat(),
        "message": "Exam started. Good luck!",
    }


# ── Submit Exam (student) ────────────────────────────────────
@router.post("/events/{event_id}/submit")
async def submit_exam(
    event_id: UUID,
    req: AnswerSubmission,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit answers for an MCQ exam. Auto-grades immediately."""
    attempt = (await db.execute(
        select(MCQAttempt).where(
            MCQAttempt.user_id == str(user.id),
            MCQAttempt.event_id == str(event_id),
            MCQAttempt.status == "in_progress",
        )
    )).scalar_one_or_none()

    if not attempt:
        raise HTTPException(status_code=400, detail="No active exam attempt found. Start the exam first.")

    # Fetch all questions
    questions = (await db.execute(
        select(MCQQuestion)
        .where(MCQQuestion.event_id == str(event_id))
        .order_by(MCQQuestion.order_index)
    )).scalars().all()

    # Grade answers
    correct = 0
    wrong = 0
    skipped = 0
    score = 0.0
    results = {}

    for q in questions:
        student_answer = req.answers.get(q.id, "").lower().strip()
        if not student_answer:
            skipped += 1
            results[q.id] = {"status": "skipped", "correct": q.correct_option}
        elif student_answer == q.correct_option:
            correct += 1
            score += q.marks
            results[q.id] = {"status": "correct", "correct": q.correct_option}
        else:
            wrong += 1
            score -= q.negative_marks
            results[q.id] = {
                "status": "wrong",
                "your_answer": student_answer,
                "correct": q.correct_option,
            }

    # Update attempt
    attempt.answers_json = json.dumps(req.answers)
    attempt.submitted_at = datetime.utcnow()
    attempt.status = "submitted"
    attempt.attempted = correct + wrong
    attempt.correct = correct
    attempt.wrong = wrong
    attempt.skipped = skipped
    attempt.score = max(0, score)  # no negative total

    # Update leaderboard
    lb = (await db.execute(
        select(LeaderboardEntry).where(
            LeaderboardEntry.event_id == str(event_id),
            LeaderboardEntry.user_id == str(user.id),
        )
    )).scalar_one_or_none()

    if lb:
        lb.total_score = attempt.score
    else:
        lb = LeaderboardEntry(
            event_id=str(event_id),
            user_id=str(user.id),
            total_score=attempt.score,
            problems_solved=correct,
        )
        db.add(lb)

    await db.flush()

    return {
        "message": "Exam submitted and graded!",
        "score": attempt.score,
        "max_score": attempt.max_score,
        "correct": correct,
        "wrong": wrong,
        "skipped": skipped,
        "total": len(questions),
        "percentage": round((attempt.score / attempt.max_score * 100) if attempt.max_score > 0 else 0, 1),
        "results": results,
    }


# ── Get Attempt Result (student views their result) ──────────
@router.get("/events/{event_id}/result")
async def get_result(
    event_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the student's exam result with question-by-question breakdown."""
    attempt = (await db.execute(
        select(MCQAttempt).where(
            MCQAttempt.user_id == str(user.id),
            MCQAttempt.event_id == str(event_id),
        )
    )).scalar_one_or_none()

    if not attempt:
        raise HTTPException(status_code=404, detail="No exam attempt found")

    if attempt.status == "in_progress":
        return {"status": "in_progress", "message": "Exam is still in progress"}

    # Get questions with explanations
    questions = (await db.execute(
        select(MCQQuestion)
        .where(MCQQuestion.event_id == str(event_id))
        .order_by(MCQQuestion.order_index)
    )).scalars().all()

    answers = json.loads(attempt.answers_json) if attempt.answers_json else {}

    question_results = []
    for q in questions:
        student_ans = answers.get(q.id, "")
        question_results.append({
            "id": q.id,
            "question": q.question_text,
            "option_a": q.option_a,
            "option_b": q.option_b,
            "option_c": q.option_c,
            "option_d": q.option_d,
            "your_answer": student_ans or None,
            "correct_answer": q.correct_option,
            "is_correct": student_ans.lower() == q.correct_option if student_ans else False,
            "marks": q.marks,
            "negative_marks": q.negative_marks,
            "explanation": q.explanation,
            "topic": q.topic,
        })

    return {
        "status": attempt.status,
        "score": attempt.score,
        "max_score": attempt.max_score,
        "percentage": round((attempt.score / attempt.max_score * 100) if attempt.max_score > 0 else 0, 1),
        "correct": attempt.correct,
        "wrong": attempt.wrong,
        "skipped": attempt.skipped,
        "total": attempt.total_questions,
        "started_at": attempt.started_at.isoformat(),
        "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
        "questions": question_results,
    }
