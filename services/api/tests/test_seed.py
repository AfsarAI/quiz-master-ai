import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from app.main import app
from app.core.database import get_db
from app.core.seeder import seed_demo_users, DEMO_USERS
from app.core.security import verify_password
from app.models.user import User

@pytest.mark.asyncio
async def test_demo_user_seeding_and_idempotency(db_session):
    """Verify demo users are seeded with Argon2id hashes, expected roles, and idempotency."""
    # First seed run
    result1 = await seed_demo_users(db_session, reset_passwords=False)
    assert result1["created"] == 2
    assert result1["updated"] == 0
    assert result1["preserved"] == 0

    # Verify student account in database
    student_res = await db_session.execute(select(User).where(User.email == "student@example.com"))
    student = student_res.scalar_one_or_none()
    assert student is not None
    assert student.role == "student"
    assert student.is_active is True
    # Password must be hashed with Argon2id, NOT stored plaintext
    assert student.hashed_password != "Password123!"
    assert student.hashed_password.startswith("$argon2id$")
    assert verify_password("Password123!", student.hashed_password) is True
    assert verify_password("WrongPassword!", student.hashed_password) is False

    # Verify educator account in database
    educator_res = await db_session.execute(select(User).where(User.email == "educator@example.com"))
    educator = educator_res.scalar_one_or_none()
    assert educator is not None
    assert educator.role == "educator"
    assert educator.is_active is True
    assert educator.hashed_password != "Password123!"
    assert verify_password("Password123!", educator.hashed_password) is True

    # Second seed run (idempotency check: should not create duplicates or fail)
    result2 = await seed_demo_users(db_session, reset_passwords=False)
    assert result2["created"] == 0
    assert result2["preserved"] == 2

    # Verify total user count has not multiplied
    all_users = (await db_session.execute(select(User))).scalars().all()
    demo_emails = [u.email for u in all_users if u.email in ["student@example.com", "educator@example.com"]]
    assert len(demo_emails) == 2

@pytest.mark.asyncio
async def test_demo_user_authentication_flow(db_session):
    """Verify student and educator can authenticate via API endpoint with documented credentials."""
    # Ensure seeded in test db
    await seed_demo_users(db_session, reset_passwords=False)

    app.dependency_overrides[get_db] = lambda: db_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test student login
        resp_student = await client.post("/api/v1/auth/login", json={
            "email": "student@example.com",
            "password": "Password123!"
        })
        assert resp_student.status_code == 200
        data_student = resp_student.json()
        assert "access_token" in data_student
        assert data_student["user"]["role"] == "student"
        assert data_student["user"]["email"] == "student@example.com"

        # Test educator login
        resp_educator = await client.post("/api/v1/auth/login", json={
            "email": "educator@example.com",
            "password": "Password123!"
        })
        assert resp_educator.status_code == 200
        data_educator = resp_educator.json()
        assert "access_token" in data_educator
        assert data_educator["user"]["role"] == "educator"

        # Test invalid password rejection
        resp_invalid = await client.post("/api/v1/auth/login", json={
            "email": "student@example.com",
            "password": "BadPassword999!"
        })
        assert resp_invalid.status_code == 401
        assert "detail" in resp_invalid.json()

    app.dependency_overrides.clear()
