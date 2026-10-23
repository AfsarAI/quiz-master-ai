import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_and_login_flow(client: AsyncClient):
    # 1. Register new student
    register_payload = {
        "email": "alice@university.edu",
        "password": "SecurePassword123!",
        "full_name": "Alice Smith",
        "role": "student"
    }
    reg_resp = await client.post("/api/v1/auth/register", json=register_payload)
    assert reg_resp.status_code == 201
    reg_data = reg_resp.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == "alice@university.edu"
    assert reg_data["user"]["role"] == "student"

    # 2. Duplicate registration should fail
    dup_resp = await client.post("/api/v1/auth/register", json=register_payload)
    assert dup_resp.status_code == 400

    # 3. Successful login
    login_resp = await client.post("/api/v1/auth/login", json={
        "email": "alice@university.edu",
        "password": "SecurePassword123!"
    })
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    token = login_data["access_token"]

    # 4. Access protected /me
    me_resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "alice@university.edu"

@pytest.mark.asyncio
async def test_invalid_login(client: AsyncClient):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "WrongPassword!"
    })
    assert resp.status_code == 401

@pytest.mark.asyncio
async def test_cannot_register_as_admin(client: AsyncClient):
    # Attempting to register as admin must be rejected
    resp = await client.post("/api/v1/auth/register", json={
        "email": "hacker@example.com",
        "password": "HackerPassword123!",
        "full_name": "Bad Actor",
        "role": "admin"
    })
    assert resp.status_code == 422
