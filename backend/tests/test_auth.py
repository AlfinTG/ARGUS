from fastapi.testclient import TestClient
from fastapi import APIRouter, Depends
from app.main import app
from app.api.deps import require_roles
from app.models.user import User

client = TestClient(app)

# Add a test-only route to verify role-gating
test_router = APIRouter()

@test_router.get("/test/scrutiny-only")
def scrutiny_only_route(current_user: User = Depends(require_roles("Scrutiny Officer"))):
    return {"message": "Access granted to scrutiny officer", "user": current_user.email}

app.include_router(test_router)

def test_login_success():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "scrutiny@aicte.gov.in", "password": "Demo@2026!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "Scrutiny Officer"
    assert data["email"] == "scrutiny@aicte.gov.in"
    assert data["token_type"] == "bearer"

def test_login_invalid_password():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "scrutiny@aicte.gov.in", "password": "WrongPassword123!"},
    )
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]

def test_get_current_user_profile():
    # 1. Login to get token
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "institution@shivneri.edu.in", "password": "Demo@2026!"},
    )
    token = login_resp.json()["access_token"]

    # 2. Call /auth/me
    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    user_data = me_resp.json()
    assert user_data["email"] == "institution@shivneri.edu.in"
    assert user_data["role"] == "Institution User"
    assert user_data["institution_id"] == "INST-014"

def test_unauthorized_token_access():
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid_or_forged_token_xyz"},
    )
    assert response.status_code == 401

def test_role_enforcement_authorized():
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "scrutiny@aicte.gov.in", "password": "Demo@2026!"},
    )
    token = login_resp.json()["access_token"]

    resp = client.get(
        "/test/scrutiny-only",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["message"] == "Access granted to scrutiny officer"

def test_role_enforcement_forbidden():
    # Login as Institution User (unauthorized for scrutiny-only route)
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "institution@shivneri.edu.in", "password": "Demo@2026!"},
    )
    token = login_resp.json()["access_token"]

    resp = client.get(
        "/test/scrutiny-only",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403
    assert "Action not permitted for role 'Institution User'" in resp.json()["detail"]

def test_role_enforcement_system_operator_bypass():
    # Login as System Operator (can perform all actions)
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "operator@aicte.gov.in", "password": "Demo@2026!"},
    )
    token = login_resp.json()["access_token"]

    resp = client.get(
        "/test/scrutiny-only",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
