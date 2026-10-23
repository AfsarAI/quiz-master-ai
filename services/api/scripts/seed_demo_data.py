#!/usr/bin/env python3
"""
Quiz-Master-AI Database Seeding Utility
Usage:
    python scripts/seed_demo_data.py
    python scripts/seed_demo_data.py --reset-passwords
"""
import sys
import os
import asyncio

# Ensure parent directory is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
API_ROOT = os.path.dirname(SCRIPT_DIR)
if API_ROOT not in sys.path:
    sys.path.insert(0, API_ROOT)

from app.core.database import session_factory
from app.core.seeder import seed_demo_users

async def run_seeder():
    reset_passwords = "--reset-passwords" in sys.argv
    print("=" * 60)
    print("🚀 Quiz-Master-AI: Seeding Demo Accounts")
    print(f"   Reset Passwords: {reset_passwords}")
    print("=" * 60)

    try:
        async with session_factory() as session:
            result = await seed_demo_users(session, reset_passwords=reset_passwords)
            print(f"Status:    {result.get('status', 'success')}")
            print(f"Created:   {result['created']}")
            print(f"Updated:   {result['updated']}")
            print(f"Preserved: {result['preserved']}")
            print("\nDetails:")
            for item in result["details"]:
                print(f" - {item['email']} ({item['role']}): {item['action']}")
            print("\n✅ Demo user seeding completed successfully.")
    except Exception as e:
        print(f"\n❌ Error during database seeding: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run_seeder())
