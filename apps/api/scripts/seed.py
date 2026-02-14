"""
CEAP Seed Data Script
Creates demo tenant, admin user, sample events, problems, and test cases.
Run: python -m scripts.seed
"""
import asyncio
import uuid
from datetime import datetime, timedelta

from sqlalchemy import text
from app.database import engine, async_session, Base
from app.models import *  # noqa: F401, F403
from app.core.security import hash_password


async def seed():
    print("🌱 Seeding database...")

    # Create all tables directly (skip Alembic for quick local setup)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tables created")

    async with async_session() as db:
        # Check if already seeded
        result = await db.execute(text("SELECT count(*) FROM tenants"))
        count = result.scalar()
        if count > 0:
            print("⚠️  Database already seeded. Skipping.")
            return

        # ── Tenant ──────────────────────────────────
        tenant_id = uuid.uuid4()
        tenant = Tenant(
            id=tenant_id,
            slug="demo",
            name="Demo University",
            logo_url=None,
            primary_color="#6366f1",
            secondary_color="#06b6d4",
            plan="campus",
            max_events=50,
            max_students=1000,
            is_active=True,
        )
        db.add(tenant)
        print("✅ Tenant: Demo University (slug: demo)")

        # ── Users ───────────────────────────────────
        admin_id = uuid.uuid4()
        admin = User(
            id=admin_id,
            tenant_id=tenant_id,
            email="admin@demo.edu",
            password_hash=hash_password("admin123"),
            full_name="Admin User",
            role="admin",
            department="Computer Science",
            email_verified=True,
            is_active=True,
        )
        db.add(admin)

        faculty_id = uuid.uuid4()
        faculty = User(
            id=faculty_id,
            tenant_id=tenant_id,
            email="faculty@demo.edu",
            password_hash=hash_password("faculty123"),
            full_name="Dr. Sarah Johnson",
            role="faculty",
            department="Computer Science",
            email_verified=True,
            is_active=True,
        )
        db.add(faculty)

        student1_id = uuid.uuid4()
        student1 = User(
            id=student1_id,
            tenant_id=tenant_id,
            email="student@demo.edu",
            password_hash=hash_password("student123"),
            full_name="Alex Kumar",
            role="student",
            department="Computer Science",
            college_id="CS2024001",
            email_verified=True,
            is_active=True,
        )
        db.add(student1)

        student2_id = uuid.uuid4()
        student2 = User(
            id=student2_id,
            tenant_id=tenant_id,
            email="student2@demo.edu",
            password_hash=hash_password("student123"),
            full_name="Priya Sharma",
            role="student",
            department="Computer Science",
            college_id="CS2024002",
            email_verified=True,
            is_active=True,
        )
        db.add(student2)
        print("✅ Users: admin, faculty, 2 students")

        # ── Event: Coding Contest ───────────────────
        event1_id = uuid.uuid4()
        event1 = Event(
            id=event1_id,
            tenant_id=tenant_id,
            title="CodeBlitz 2026",
            slug="codeblitz-2026",
            description="Annual coding competition. Solve algorithmic problems in Python, C++, Java, or JavaScript. Top performers win certificates and prizes!",
            event_type="coding_contest",
            status="ongoing",
            registration_start=datetime.utcnow() - timedelta(days=7),
            registration_end=datetime.utcnow() + timedelta(days=30),
            event_start=datetime.utcnow() - timedelta(hours=1),
            event_end=datetime.utcnow() + timedelta(days=30),
            max_participants=200,
            is_team_event=False,
            team_min_size=1,
            team_max_size=1,
            scoring_formula={"auto": 1.0, "judge": 0.0},
            created_by=faculty_id,
        )
        db.add(event1)

        # Second event (hackathon)
        event2_id = uuid.uuid4()
        event2 = Event(
            id=event2_id,
            tenant_id=tenant_id,
            title="HackFest Spring 2026",
            slug="hackfest-spring-2026",
            description="48-hour hackathon. Build innovative solutions to real-world problems. Teams of 2-4 members.",
            event_type="hackathon",
            status="published",
            registration_start=datetime.utcnow(),
            registration_end=datetime.utcnow() + timedelta(days=14),
            event_start=datetime.utcnow() + timedelta(days=15),
            event_end=datetime.utcnow() + timedelta(days=17),
            max_participants=100,
            is_team_event=True,
            team_min_size=2,
            team_max_size=4,
            scoring_formula={"auto": 0.4, "judge": 0.6},
            created_by=faculty_id,
        )
        db.add(event2)

        # Third event (completed)
        event3_id = uuid.uuid4()
        event3 = Event(
            id=event3_id,
            tenant_id=tenant_id,
            title="DSA Challenge Dec 2025",
            slug="dsa-challenge-dec-2025",
            description="Data Structures & Algorithms coding challenge. Test your problem solving skills!",
            event_type="coding_contest",
            status="completed",
            event_start=datetime.utcnow() - timedelta(days=60),
            event_end=datetime.utcnow() - timedelta(days=59),
            max_participants=150,
            is_team_event=False,
            created_by=faculty_id,
        )
        db.add(event3)
        print("✅ Events: CodeBlitz 2026, HackFest Spring 2026, DSA Challenge Dec 2025")

        # ── Register students for CodeBlitz ─────────
        reg1 = Registration(
            event_id=event1_id,
            user_id=student1_id,
            status="approved",
        )
        reg2 = Registration(
            event_id=event1_id,
            user_id=student2_id,
            status="approved",
        )
        db.add(reg1)
        db.add(reg2)
        print("✅ Registered 2 students for CodeBlitz 2026")

        # ── Problems ────────────────────────────────
        # Problem 1: Two Sum (Easy)
        p1_id = uuid.uuid4()
        p1 = Problem(
            id=p1_id,
            tenant_id=tenant_id,
            title="Two Sum",
            slug="two-sum",
            problem_type="coding",
            difficulty="easy",
            description="""Given an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

Return the answer as two space-separated indices (0-indexed).""",
            input_format="First line: n (size of array)\nSecond line: n space-separated integers\nThird line: target integer",
            output_format="Two space-separated indices",
            constraints="2 <= n <= 10^4\n-10^9 <= nums[i] <= 10^9",
            sample_input="4\n2 7 11 15\n9",
            sample_output="0 1",
            time_limit_ms=2000,
            memory_limit_kb=262144,
            allowed_languages=["python", "cpp", "java", "javascript"],
            tags=["array", "hash-table"],
            created_by=faculty_id,
        )
        db.add(p1)

        # Test cases for Two Sum
        tc1 = TestCase(problem_id=p1_id, input="4\n2 7 11 15\n9", expected_output="0 1", is_sample=True, weight=1, order_index=0)
        tc2 = TestCase(problem_id=p1_id, input="3\n3 2 4\n6", expected_output="1 2", is_sample=True, weight=1, order_index=1)
        tc3 = TestCase(problem_id=p1_id, input="2\n3 3\n6", expected_output="0 1", is_sample=False, weight=1, order_index=2)
        tc4 = TestCase(problem_id=p1_id, input="5\n1 5 3 7 2\n8", expected_output="1 2", is_sample=False, weight=1, order_index=3)  # 5+3=8 -> indices 1,2
        db.add_all([tc1, tc2, tc3, tc4])

        # Problem 2: Fibonacci (Easy)
        p2_id = uuid.uuid4()
        p2 = Problem(
            id=p2_id,
            tenant_id=tenant_id,
            title="Fibonacci Number",
            slug="fibonacci-number",
            problem_type="coding",
            difficulty="easy",
            description="""Given an integer `n`, return the n-th Fibonacci number.

The Fibonacci sequence is: 0, 1, 1, 2, 3, 5, 8, 13, 21, ...

F(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2) for n > 1.""",
            input_format="A single integer n",
            output_format="The n-th Fibonacci number",
            constraints="0 <= n <= 30",
            sample_input="5",
            sample_output="5",
            time_limit_ms=1000,
            memory_limit_kb=262144,
            allowed_languages=["python", "cpp", "java", "javascript"],
            tags=["math", "recursion", "dp"],
            created_by=faculty_id,
        )
        db.add(p2)

        tc5 = TestCase(problem_id=p2_id, input="5", expected_output="5", is_sample=True, weight=1, order_index=0)
        tc6 = TestCase(problem_id=p2_id, input="0", expected_output="0", is_sample=True, weight=1, order_index=1)
        tc7 = TestCase(problem_id=p2_id, input="10", expected_output="55", is_sample=False, weight=1, order_index=2)
        tc8 = TestCase(problem_id=p2_id, input="20", expected_output="6765", is_sample=False, weight=1, order_index=3)
        db.add_all([tc5, tc6, tc7, tc8])

        # Problem 3: Reverse String (Medium)
        p3_id = uuid.uuid4()
        p3 = Problem(
            id=p3_id,
            tenant_id=tenant_id,
            title="Palindrome Check",
            slug="palindrome-check",
            problem_type="coding",
            difficulty="medium",
            description="""Given a string `s`, determine if it is a palindrome.

A palindrome reads the same forward and backward.

Consider only alphanumeric characters and ignore cases.""",
            input_format="A single string",
            output_format="'true' if palindrome, 'false' otherwise",
            constraints="1 <= s.length <= 2 * 10^5",
            sample_input="racecar",
            sample_output="true",
            time_limit_ms=1000,
            memory_limit_kb=262144,
            allowed_languages=["python", "cpp", "java", "javascript"],
            tags=["string", "two-pointers"],
            created_by=faculty_id,
        )
        db.add(p3)

        tc9 = TestCase(problem_id=p3_id, input="racecar", expected_output="true", is_sample=True, weight=1, order_index=0)
        tc10 = TestCase(problem_id=p3_id, input="hello", expected_output="false", is_sample=True, weight=1, order_index=1)
        tc11 = TestCase(problem_id=p3_id, input="A man a plan a canal Panama", expected_output="true", is_sample=False, weight=1, order_index=2)
        tc12 = TestCase(problem_id=p3_id, input="abba", expected_output="true", is_sample=False, weight=1, order_index=3)
        db.add_all([tc9, tc10, tc11, tc12])
        print("✅ Problems: Two Sum, Fibonacci Number, Palindrome Check (12 test cases)")

        # ── Link problems to CodeBlitz event ────────
        ep1 = EventProblem(event_id=event1_id, problem_id=p1_id, order_index=0, points=100)
        ep2 = EventProblem(event_id=event1_id, problem_id=p2_id, order_index=1, points=100)
        ep3 = EventProblem(event_id=event1_id, problem_id=p3_id, order_index=2, points=150)
        db.add_all([ep1, ep2, ep3])
        print("✅ Linked 3 problems to CodeBlitz 2026")

        await db.commit()

    print("\n🎉 Seed complete! Here are your test accounts:\n")
    print("  ┌─────────────────────────────────────────┐")
    print("  │  Role      │ Email              │ Pass   │")
    print("  ├─────────────────────────────────────────┤")
    print("  │  Admin     │ admin@demo.edu     │ admin123   │")
    print("  │  Faculty   │ faculty@demo.edu   │ faculty123 │")
    print("  │  Student   │ student@demo.edu   │ student123 │")
    print("  │  Student 2 │ student2@demo.edu  │ student123 │")
    print("  └─────────────────────────────────────────┘")
    print("\n  Tenant slug: demo")
    print("  Active event: CodeBlitz 2026 (3 problems)")


if __name__ == "__main__":
    asyncio.run(seed())
