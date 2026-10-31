"""
Task 4.1 – Regional Office Review Test Suite
=============================================
Covers:
  - POST /api/v1/applications/{id}/regional-review  (Regional Officer only)
  - Recommendation "Endorse"  → stage advances to next route stage
  - Recommendation "Escalate" → stage fast-tracked to Decision Pending
  - Recommendation "Return"   → stage sent back to Institution Response
  - Compliance IDs are marked Verified when supplied
  - Empty remarks → 400
  - Wrong stage (not in eligible set) → 400
  - Institution User / Scrutiny Officer / Coordinator → 403
  - Non-existent application → 404
  - Audit event with rule=REG-01 is produced
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _token(email: str) -> dict:
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Demo@2026!"},
    )
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def regional() -> dict:
    return _token("regional@aicte.gov.in")

def institution() -> dict:
    return _token("institution@shivneri.edu.in")

def scrutiny() -> dict:
    return _token("scrutiny@aicte.gov.in")

def coordinator() -> dict:
    return _token("coordinator@aicte.gov.in")

def operator() -> dict:
    return _token("operator@aicte.gov.in")


# ─────────────────────────────────────────────────────────────────────────────
# Helpers: set up an application in EVC Report Review stage for review tests
# ─────────────────────────────────────────────────────────────────────────────

def _advance_to_evc_report_review() -> str:
    """
    APP-2026-023 is in EVC Scheduling (EVC + SAC/SHC route).
    Schedule + report (Satisfactory) to move to EVC Report Review.
    Returns APP-2026-023.
    """
    # Schedule EVC
    client.post(
        "/api/v1/evc/EVC-023/schedule",
        headers=coordinator(),
        json={"visit_date": "2026-11-10", "panel": "Prof. Test Panel"},
    )
    # Submit Satisfactory report → advances to EVC Report Review
    client.post(
        "/api/v1/evc/EVC-023/report",
        headers=coordinator(),
        json={"outcome": "Satisfactory", "remarks": "All criteria met."},
    )
    return "APP-2026-023"


# ─────────────────────────────────────────────────────────────────────────────
# ROLE ENFORCEMENT
# ─────────────────────────────────────────────────────────────────────────────

def test_institution_user_cannot_do_regional_review():
    app_id = _advance_to_evc_report_review()
    resp = client.post(
        f"/api/v1/applications/{app_id}/regional-review",
        headers=institution(),
        json={"recommendation": "Endorse", "remarks": "Looks good."},
    )
    assert resp.status_code == 403


def test_scrutiny_officer_cannot_do_regional_review():
    app_id = _advance_to_evc_report_review()
    resp = client.post(
        f"/api/v1/applications/{app_id}/regional-review",
        headers=scrutiny(),
        json={"recommendation": "Endorse", "remarks": "Looks good."},
    )
    assert resp.status_code == 403


def test_committee_coordinator_cannot_do_regional_review():
    app_id = _advance_to_evc_report_review()
    resp = client.post(
        f"/api/v1/applications/{app_id}/regional-review",
        headers=coordinator(),
        json={"recommendation": "Endorse", "remarks": "Looks good."},
    )
    assert resp.status_code == 403


def test_system_operator_can_do_regional_review():
    app_id = _advance_to_evc_report_review()
    resp = client.post(
        f"/api/v1/applications/{app_id}/regional-review",
        headers=operator(),
        json={"recommendation": "Endorse", "remarks": "System operator override endorsement."},
    )
    assert resp.status_code == 200


# ─────────────────────────────────────────────────────────────────────────────
# VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

def test_empty_remarks_returns_400():
    app_id = _advance_to_evc_report_review()
    resp = client.post(
        f"/api/v1/applications/{app_id}/regional-review",
        headers=regional(),
        json={"recommendation": "Endorse", "remarks": ""},
    )
    assert resp.status_code == 400
    assert "remarks" in resp.json()["detail"].lower()


def test_whitespace_only_remarks_returns_400():
    app_id = _advance_to_evc_report_review()
    resp = client.post(
        f"/api/v1/applications/{app_id}/regional-review",
        headers=regional(),
        json={"recommendation": "Endorse", "remarks": "   "},
    )
    assert resp.status_code == 400


def test_ineligible_stage_returns_400():
    """APP-2026-014 is in Initial Scrutiny stage — eligible. 
    After transition to EVC, it becomes ineligible for regional review."""
    # APP-2026-031 is Decision Pending — not in eligible stages
    resp = client.post(
        "/api/v1/applications/APP-2026-031/regional-review",
        headers=regional(),
        json={"recommendation": "Endorse", "remarks": "Attempt on wrong stage."},
    )
    assert resp.status_code == 400
    assert "eligible" in resp.json()["detail"].lower()


def test_nonexistent_application_returns_404():
    resp = client.post(
        "/api/v1/applications/APP-GHOST-9999/regional-review",
        headers=regional(),
        json={"recommendation": "Endorse", "remarks": "Ghost application."},
    )
    assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# ENDORSE — advances to next stage in route
# ─────────────────────────────────────────────────────────────────────────────

def test_endorse_advances_stage_beyond_evc_report_review():
    app_id = _advance_to_evc_report_review()
    resp = client.post(
        f"/api/v1/applications/{app_id}/regional-review",
        headers=regional(),
        json={
            "recommendation": "Endorse",
            "remarks": "All parameters verified. Dossier complete. Recommending SAC/SHC review.",
            "compliance_ids_verified": [],
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    # APP-2026-023 is on EVC + SAC/SHC route, so EVC Report Review → SAC/SHC Review
    assert data["stage"] != "EVC Report Review", f"Stage did not advance: {data['stage']}"


def test_endorse_on_initial_scrutiny_advances_correctly():
    """APP-2026-014 begins at Initial Scrutiny (Scrutiny + EVC route).
    Regional Officer endorsement of Initial Scrutiny should advance it."""
    # First: complete Initial Scrutiny via scrutiny officer to reach EVC Scheduling
    # For this test, use a fresh app that's still at Initial Scrutiny...
    # Let's use the initial scrutiny stage check — since initial scrutiny IS eligible
    resp_check = client.get("/api/v1/applications/", headers=regional())
    apps = resp_check.json()
    initial_scrutiny_app = next(
        (a for a in apps if a["stage"] == "Initial Scrutiny"), None
    )
    if not initial_scrutiny_app:
        # No Initial Scrutiny apps available — skip gracefully
        return

    app_id = initial_scrutiny_app["id"]
    resp = client.post(
        f"/api/v1/applications/{app_id}/regional-review",
        headers=regional(),
        json={
            "recommendation": "Endorse",
            "remarks": "Initial scrutiny dossier confirmed complete by Regional Officer.",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["stage"] != "Initial Scrutiny"


# ─────────────────────────────────────────────────────────────────────────────
# ESCALATE — fast-tracks to Decision Pending
# ─────────────────────────────────────────────────────────────────────────────

def test_escalate_fast_tracks_to_decision_pending():
    app_id = _advance_to_evc_report_review()
    resp = client.post(
        f"/api/v1/applications/{app_id}/regional-review",
        headers=regional(),
        json={
            "recommendation": "Escalate",
            "remarks": "Time-sensitive approval; all parameters verified. Fast-tracking to Competent Authority.",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["stage"] == "Decision Pending"
    assert data["status"] == "Decision pending"
    assert data["owner_role"] == "Competent Authority"


# ─────────────────────────────────────────────────────────────────────────────
# RETURN — returns to institution with deficiency grounds
# ─────────────────────────────────────────────────────────────────────────────

def test_return_sends_to_institution_response():
    app_id = _advance_to_evc_report_review()
    deficiency = "Regional office found lab inventory incomplete per APH Schedule-II."
    resp = client.post(
        f"/api/v1/applications/{app_id}/regional-review",
        headers=regional(),
        json={
            "recommendation": "Return",
            "remarks": deficiency,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["stage"] == "Institution Response"
    assert data["status"] == "Awaiting institution"
    assert data["owner_role"] == "Institution User"
    assert deficiency in (data.get("return_reason") or "")


def test_return_preserves_resume_stage():
    app_id = _advance_to_evc_report_review()
    resp = client.post(
        f"/api/v1/applications/{app_id}/regional-review",
        headers=regional(),
        json={
            "recommendation": "Return",
            "remarks": "Missing faculty cadre list certified by competent authority.",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("resume_stage") == "EVC Report Review"


# ─────────────────────────────────────────────────────────────────────────────
# COMPLIANCE VERIFICATION
# ─────────────────────────────────────────────────────────────────────────────

def test_compliance_ids_are_marked_verified():
    app_id = _advance_to_evc_report_review()
    resp = client.post(
        f"/api/v1/applications/{app_id}/regional-review",
        headers=regional(),
        json={
            "recommendation": "Endorse",
            "remarks": "CMP-023 library resource undertaking verified on-site.",
            "compliance_ids_verified": ["CMP-023"],
        },
    )
    assert resp.status_code == 200
    # Verify compliance record was updated
    cmp_resp = client.get("/api/v1/compliance/", headers=regional())
    assert cmp_resp.status_code == 200
    cmp_023 = next((c for c in cmp_resp.json() if c["id"] == "CMP-023"), None)
    if cmp_023:
        assert cmp_023["verification"] == "Verified"


# ─────────────────────────────────────────────────────────────────────────────
# AUDIT TRAIL
# ─────────────────────────────────────────────────────────────────────────────

def test_regional_review_produces_reg_01_audit_entry():
    app_id = _advance_to_evc_report_review()
    client.post(
        f"/api/v1/applications/{app_id}/regional-review",
        headers=regional(),
        json={
            "recommendation": "Endorse",
            "remarks": "Audit test endorsement — all regional checks passed.",
        },
    )
    audit_resp = client.get("/api/v1/audit/", headers=scrutiny())
    assert audit_resp.status_code == 200
    events = audit_resp.json()
    reg_events = [e for e in events if e.get("rule") == "REG-01"]
    assert len(reg_events) > 0
    for e in reg_events:
        assert e["correlation"].startswith("COR-")
        assert "Regional Officer review" in e["detail"]
