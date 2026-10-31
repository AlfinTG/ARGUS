from fastapi.testclient import TestClient
from fastapi import APIRouter, Depends
from jose import jwt
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

# ==================== NEW TESTS FOR TASK 1: SIGNUP & GOOGLE AUTH ====================

def test_signup_success_institution_user():
    payload = {
        "email": "principal@pune-tech.edu.in",
        "password": "SecurePassword123!",
        "full_name": "Prof. Anand Kulkarni",
        "role": "Institution User",
        "institution_id": "INST-099",
    }
    resp = client.post("/api/v1/auth/signup", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["role"] == "Institution User"
    assert data["institution_id"] == "INST-099"
    assert data["email"] == "principal@pune-tech.edu.in"
    assert data["full_name"] == "Prof. Anand Kulkarni"

def test_signup_forbidden_for_non_institution_roles():
    # Attempting to self-register as Regional Officer
    payload_ro = {
        "email": "attacker.ro@aicte.gov.in",
        "password": "SecurePassword123!",
        "full_name": "Attacker RO",
        "role": "Regional Officer",
        "region": "North",
    }
    resp_ro = client.post("/api/v1/auth/signup", json=payload_ro)
    assert resp_ro.status_code == 403
    assert "strictly permitted for 'Institution User' only" in resp_ro.json()["detail"]

    # Attempting to self-register as System Operator
    payload_admin = {
        "email": "attacker.admin@aicte.gov.in",
        "password": "SecurePassword123!",
        "full_name": "Attacker Admin",
        "role": "System Operator",
    }
    resp_admin = client.post("/api/v1/auth/signup", json=payload_admin)
    assert resp_admin.status_code == 403
    assert "strictly permitted for 'Institution User' only" in resp_admin.json()["detail"]

def test_signup_missing_institution_id():
    payload = {
        "email": "test.college@aicte.gov.in",
        "password": "SecurePassword123!",
        "full_name": "Test College User",
        "role": "Institution User",
        "institution_id": "",  # Empty
    }
    resp = client.post("/api/v1/auth/signup", json=payload)
    assert resp.status_code == 400
    assert "institution_id is required" in resp.json()["detail"]

def test_signup_invalid_role():
    payload = {
        "email": "hacker@evil.com",
        "password": "SecurePassword123!",
        "full_name": "Fake User",
        "role": "Super Admin Prime",
    }
    resp = client.post("/api/v1/auth/signup", json=payload)
    assert resp.status_code == 403
    assert "strictly permitted for 'Institution User' only" in resp.json()["detail"]

def test_signup_duplicate_email():
    payload = {
        "email": "institution@shivneri.edu.in",  # already in seed DB
        "password": "AnotherPassword123!",
        "full_name": "Duplicate Institution User",
        "role": "Institution User",
        "institution_id": "INST-014",
    }
    resp = client.post("/api/v1/auth/signup", json=payload)
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"]

def test_google_auth_existing_user():
    # Existing user: scrutiny@aicte.gov.in
    payload = {
        "credential": "mock_google_credential_payload",
        "email": "scrutiny@aicte.gov.in",
        "full_name": "Rajesh Sharma",
    }
    resp = client.post("/api/v1/auth/google", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "scrutiny@aicte.gov.in"
    assert data["role"] == "Scrutiny Officer"
    assert "access_token" in data

def test_google_auth_new_user_provisioning():
    new_email = "new.google.user@gmail.com"
    payload = {
        "credential": "mock_google_credential_payload",
        "email": new_email,
        "full_name": "Priya Deshmukh",
        "role": "Institution User",
        "institution_id": "INST-GOOGLE-1",
    }
    resp = client.post("/api/v1/auth/google", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == new_email
    assert data["full_name"] == "Priya Deshmukh"
    assert data["role"] == "Institution User"
    assert data["institution_id"] == "INST-GOOGLE-1"
    assert "access_token" in data

def test_google_auth_missing_email_fails():
    payload = {
        "credential": "invalid_opaque_non_jwt_string",
    }
    resp = client.post("/api/v1/auth/google", json=payload)
    assert resp.status_code == 400
    assert "Could not resolve user email" in resp.json()["detail"]
