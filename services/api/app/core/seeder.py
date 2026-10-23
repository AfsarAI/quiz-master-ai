import os
import logging
from typing import Dict, Any, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models.user import User

logger = logging.getLogger("quizmaster.seeder")

DEMO_USERS: List[Dict[str, Any]] = [
    {
        "email": "student@example.com",
        "password": "Password123!",
        "full_name": "Demo Student",
        "role": "student",
        "is_active": True,
    },
    {
        "email": "educator@example.com",
        "password": "Password123!",
        "full_name": "Demo Educator",
        "role": "educator",
        "is_active": True,
    },
]

async def seed_demo_users(session: AsyncSession, reset_passwords: bool = False) -> Dict[str, Any]:
    """
    Idempotently seed standard demo users into the application database.
    
    Safety Rules:
    - Never runs silently in production without explicit ALLOW_PRODUCTION_SEED=true.
    - Preserves existing accounts without creating duplicate key conflicts.
    - Uses Argon2id password hashing (never stores plaintext).
    - Never modifies unrelated accounts.
    - Never grants admin privileges to demo users.
    """
    if settings.ENVIRONMENT == "production" and os.environ.get("ALLOW_PRODUCTION_SEED", "").lower() != "true":
        logger.warning("Skipping demo user seeding: ENVIRONMENT is production and ALLOW_PRODUCTION_SEED is not set.")
        return {"status": "skipped", "reason": "production_environment", "created": 0, "preserved": 0, "updated": 0}

    results = {"created": 0, "preserved": 0, "updated": 0, "details": []}

    for demo in DEMO_USERS:
        email = demo["email"].lower()
        stmt = select(User).where(User.email == email)
        res = await session.execute(stmt)
        user = res.scalar_one_or_none()

        if user is None:
            # Create new demo user
            new_user = User(
                email=email,
                hashed_password=get_password_hash(demo["password"]),
                full_name=demo["full_name"],
                role=demo["role"],
                is_active=demo["is_active"],
            )
            session.add(new_user)
            results["created"] += 1
            results["details"].append({"email": email, "action": "created", "role": demo["role"]})
            logger.info(f"Created demo user: {email} (role: {demo['role']})")
        else:
            # User already exists - check if update is requested
            needs_update = False
            if reset_passwords and not verify_password(demo["password"], user.hashed_password):
                user.hashed_password = get_password_hash(demo["password"])
                needs_update = True
            
            if user.role != demo["role"]:
                user.role = demo["role"]
                needs_update = True

            if needs_update:
                results["updated"] += 1
                results["details"].append({"email": email, "action": "updated", "role": demo["role"]})
                logger.info(f"Updated demo user credentials/role: {email}")
            else:
                results["preserved"] += 1
                results["details"].append({"email": email, "action": "preserved", "role": demo["role"]})
                logger.info(f"Preserved existing demo user: {email}")

    await session.commit()
    return results

if __name__ == "__main__":
    import asyncio
    import sys
    from app.core.database import session_factory

    async def main():
        reset = "--reset-passwords" in sys.argv
        print(f"Connecting to database to seed demo users (reset_passwords={reset})...")
        async with session_factory() as session:
            res = await seed_demo_users(session, reset_passwords=reset)
            print(f"Seeding completed successfully: {res}")

    asyncio.run(main())
