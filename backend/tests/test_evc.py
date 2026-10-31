"""
Task 3.3 – Expert Visit Committee (EVC) Test Suite
====================================================
Covers:
  - GET /api/v1/evc/       — list all EVC tasks (all authenticated roles)
  - POST /api/v1/evc/{id}/schedule  — schedule a visit (Committee Coordinator only)
  - POST /api/v1/evc/{id}/report    — submit report with rubric (Committee Coordinator only)
  - Outcome "Satisfactory"  -> advances application to next route stage
  - Outcome "Deficiencies Noted" -> marks application "Action required"
  - Virtual Hybrid Inspection mode is accepted
  - Missing/empty visit_date or panel yields 400
  - Institution User and Scrutiny Officer are forbidden (403)
  - Non-existent EVC task yields 404
  - Audit entries are created for every EVC action
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# Helpers

def _token(email: str) -> dict:
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Demo@2026!"},
    )
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def coordinator() -> dict:
    return _token("coordinator@aicte.gov.in")

def institution() -> dict:
    return _token("institution@shivneri.edu.in")

def scrutiny() -> dict:
    return _token("scrutiny@aicte.gov.in")


# ─────────────────────────────────────────────────────────────────────────────
# 3.1 LIST EVC TASKS
# ─────────────────────────────────────────────────────────────────────────────

def test_coordinator_can_list_evc_tasks():
    resp = client.get("/api/v1/evc/", headers=coordinator())
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 2


def test_evc_list_contains_seed_tasks():
    resp = client.get("/api/v1/evc/", headers=coordinator())
    ids = [e["id"] for e in resp.json()]
    assert "EVC-023" in ids
    assert "EVC-041" in ids


def test_all_roles_can_read_evc_queue():
    for h in [institution(), scrutiny()]:
        resp = client.get("/api/v1/evc/", headers=h)
        assert resp.status_code == 200


def test_evc_task_has_required_fields():
    resp = client.get("/api/v1/evc/", headers=coordinator())
    task = next(e for e in resp.json() if e["id"] == "EVC-023")
    for field in ("id", "app_id", "institution", "status", "visit_date", "panel", "report_status"):
        assert field in task, f"Missing field: {field}"


# ─────────────────────────────────────────────────────────────────────────────
# 3.2 SCHEDULE EVC VISIT
# ─────────────────────────────────────────────────────────────────────────────

def test_coordinator_can_schedule_physical_visit():
    resp = client.post(
        "/api/v1/evc/EVC-041/schedule",
        headers=coordinator(),
        json={
            "visit_date": "2026-12-10",
            "panel": "Prof. A. Mehta (Chairman), Dr. S. Kumar (Expert)",
            "inspection_mode": "Physical Visit",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "Scheduled"
    assert data["visit_date"] == "2026-12-10"
    assert "Mehta" in data["panel"]


def test_coordinator_can_schedule_virtual_hybrid_inspection():
    resp = client.post(
        "/api/v1/evc/EVC-023/schedule",
        headers=coordinator(),
        json={
            "visit_date": "2026-11-20",
            "panel": "Prof. R. Joshi (Chairman), Dr. N. Singh (Expert)",
            "inspection_mode": "Virtual Hybrid Inspection",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "Scheduled"
    assert data["visit_date"] == "2026-11-20"


def test_schedule_empty_visit_date_returns_400():
    resp = client.post(
        "/api/v1/evc/EVC-041/schedule",
        headers=coordinator(),
        json={"visit_date": "", "panel": "Dr. A. Kumar"},
    )
    assert resp.status_code == 400
    assert "visit date" in resp.json()["detail"].lower()


def test_schedule_empty_panel_returns_400():
    resp = client.post(
        "/api/v1/evc/EVC-041/schedule",
        headers=coordinator(),
        json={"visit_date": "2026-12-01", "panel": ""},
    )
    assert resp.status_code == 400
    assert "panel" in resp.json()["detail"].lower()


def test_institution_user_cannot_schedule_evc():
    resp = client.post(
        "/api/v1/evc/EVC-041/schedule",
        headers=institution(),
        json={"visit_date": "2026-12-01", "panel": "Prof. X"},
    )
    assert resp.status_code == 403


def test_scrutiny_officer_cannot_schedule_evc():
    resp = client.post(
        "/api/v1/evc/EVC-041/schedule",
        headers=scrutiny(),
        json={"visit_date": "2026-12-01", "panel": "Prof. X"},
    )
    assert resp.status_code == 403


def test_schedule_nonexistent_evc_returns_404():
    resp = client.post(
        "/api/v1/evc/EVC-INVALID-999/schedule",
        headers=coordinator(),
        json={"visit_date": "2026-12-01", "panel": "Prof. X"},
    )
    assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# 3.3 SUBMIT EVC REPORT
# ─────────────────────────────────────────────────────────────────────────────

def _schedule(evc_id: str, visit_date: str = "2026-11-15") -> None:
    client.post(
        f"/api/v1/evc/{evc_id}/schedule",
        headers=coordinator(),
        json={"visit_date": visit_date, "panel": "Prof. Test Panel"},
    )


def test_satisfactory_outcome_marks_evc_completed():
    _schedule("EVC-023")
    resp = client.post(
        "/api/v1/evc/EVC-023/report",
        headers=coordinator(),
        json={
            "outcome": "Satisfactory",
            "remarks": "All APH parameters verified satisfactory.",
            "infrastructure_ok": True,
            "laboratories_ok": True,
            "library_ok": True,
            "faculty_cadre_ok": True,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "Completed"
    assert data["report_status"] == "Submitted"


def test_satisfactory_outcome_advances_linked_app_stage():
    _schedule("EVC-023")
    client.post(
        "/api/v1/evc/EVC-023/report",
        headers=coordinator(),
        json={"outcome": "Satisfactory", "remarks": "All good."},
    )
    apps_resp = client.get("/api/v1/applications/", headers=coordinator())
    app_023 = next((a for a in apps_resp.json() if a["id"] == "APP-2026-023"), None)
    assert app_023 is not None
    # Stage must have advanced beyond EVC Scheduling
    assert app_023["stage"] != "EVC Scheduling", (
        f"Expected stage advance past EVC Scheduling, got: {app_023['stage']}"
    )


def test_deficiencies_noted_marks_app_action_required():
    _schedule("EVC-041")
    resp = client.post(
        "/api/v1/evc/EVC-041/report",
        headers=coordinator(),
        json={
            "outcome": "Deficiencies Noted",
            "remarks": "Laboratory equipment severely below APH norms.",
            "infrastructure_ok": True,
            "laboratories_ok": False,
            "library_ok": True,
            "faculty_cadre_ok": True,
        },
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "Completed"
    assert resp.json()["report_status"] == "Submitted"

    apps_resp = client.get("/api/v1/applications/", headers=coordinator())
    app_041 = next((a for a in apps_resp.json() if a["id"] == "APP-2026-041"), None)
    assert app_041 is not None
    assert app_041["status"] == "Action required"


def test_deficiencies_noted_records_remarks_as_return_reason():
    _schedule("EVC-041")
    deficiency_note = "Faculty cadre and lab equipment do not meet minimum APH 2026-27 norms."
    client.post(
        "/api/v1/evc/EVC-041/report",
        headers=coordinator(),
        json={"outcome": "Deficiencies Noted", "remarks": deficiency_note},
    )
    apps_resp = client.get("/api/v1/applications/", headers=coordinator())
    app_041 = next((a for a in apps_resp.json() if a["id"] == "APP-2026-041"), None)
    assert app_041 is not None
    # return_reason or returnReason (alias) should contain the deficiency note
    reason = app_041.get("returnReason") or app_041.get("return_reason", "")
    assert deficiency_note in reason


def test_rubric_checklist_all_fields_accepted():
    _schedule("EVC-023")
    resp = client.post(
        "/api/v1/evc/EVC-023/report",
        headers=coordinator(),
        json={
            "outcome": "Satisfactory",
            "remarks": "All rubric parameters met.",
            "infrastructure_ok": True,
            "laboratories_ok": True,
            "library_ok": True,
            "faculty_cadre_ok": True,
        },
    )
    assert resp.status_code == 200


def test_institution_user_cannot_submit_evc_report():
    _schedule("EVC-041")
    resp = client.post(
        "/api/v1/evc/EVC-041/report",
        headers=institution(),
        json={"outcome": "Satisfactory", "remarks": "Attempt."},
    )
    assert resp.status_code == 403


def test_scrutiny_officer_cannot_submit_evc_report():
    _schedule("EVC-041")
    resp = client.post(
        "/api/v1/evc/EVC-041/report",
        headers=scrutiny(),
        json={"outcome": "Satisfactory", "remarks": "Attempt."},
    )
    assert resp.status_code == 403


def test_report_nonexistent_evc_returns_404():
    resp = client.post(
        "/api/v1/evc/EVC-GHOST-000/report",
        headers=coordinator(),
        json={"outcome": "Satisfactory", "remarks": "Test."},
    )
    assert resp.status_code == 404


def test_evc_report_produces_evc_02_audit_entry():
    _schedule("EVC-023")
    client.post(
        "/api/v1/evc/EVC-023/report",
        headers=coordinator(),
        json={"outcome": "Satisfactory", "remarks": "Audit trail test."},
    )
    audit_resp = client.get("/api/v1/audit/", headers=scrutiny())
    assert audit_resp.status_code == 200
    events = audit_resp.json()
    evc_report_events = [e for e in events if e.get("rule") == "EVC-02"]
    assert len(evc_report_events) > 0
    for e in evc_report_events:
        assert e["correlation"].startswith("COR-")


def test_evc_schedule_produces_evc_01_audit_entry():
    client.post(
        "/api/v1/evc/EVC-023/schedule",
        headers=coordinator(),
        json={
            "visit_date": "2026-12-05",
            "panel": "Prof. Audit Tester",
            "inspection_mode": "Physical Visit",
        },
    )
    audit_resp = client.get("/api/v1/audit/", headers=scrutiny())
    events = audit_resp.json()
    evc_schedule_events = [e for e in events if e.get("rule") == "EVC-01"]
    assert len(evc_schedule_events) > 0
