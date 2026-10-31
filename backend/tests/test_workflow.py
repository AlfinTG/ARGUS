from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token(email: str) -> str:
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Demo@2026!"},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]

def test_list_applications():
    token = get_auth_token("scrutiny@aicte.gov.in")
    resp = client.get(
        "/api/v1/applications/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    apps = resp.json()
    assert len(apps) >= 6
    app_ids = [a["id"] for a in apps]
    assert "APP-2026-014" in app_ids

def test_stage_transition_and_deficiency_lifecycle():
    scrutiny_token = get_auth_token("scrutiny@aicte.gov.in")
    inst_token = get_auth_token("institution@shivneri.edu.in")

    # 1. Complete Initial Scrutiny stage on APP-2026-014 (Route: Scrutiny + EVC)
    resp = client.post(
        "/api/v1/applications/APP-2026-014/transition",
        headers={"Authorization": f"Bearer {scrutiny_token}"},
        json={"action": "complete"},
    )
    assert resp.status_code == 200
    app_data = resp.json()
    assert app_data["stage"] == "EVC Scheduling"
    assert app_data["status"] == "Awaiting EVC"

    # 2. Return for deficiency with empty reason should fail with 400
    fail_resp = client.post(
        "/api/v1/applications/APP-2026-014/transition",
        headers={"Authorization": f"Bearer {scrutiny_token}"},
        json={"action": "return", "reason": ""},
    )
    assert fail_resp.status_code == 400
    assert "explicit, meaningful reason" in fail_resp.json()["detail"]

    # 3. Return for deficiency with valid reason
    return_resp = client.post(
        "/api/v1/applications/APP-2026-014/transition",
        headers={"Authorization": f"Bearer {scrutiny_token}"},
        json={"action": "return", "reason": "Missing endorsed lab layout schematic."},
    )
    assert return_resp.status_code == 200
    returned_data = return_resp.json()
    assert returned_data["stage"] == "Institution Response"
    assert returned_data["status"] == "Awaiting institution"
    assert returned_data["resume_stage"] == "EVC Scheduling"
    assert returned_data["return_reason"] == "Missing endorsed lab layout schematic."

    # 3b. Verify Deficiency Notice PDF memo is available and signed with SHA-256
    memo_resp = client.get(
        "/api/v1/applications/APP-2026-014/letter?letter_type=deficiency",
        headers={"Authorization": f"Bearer {inst_token}"},
    )
    assert memo_resp.status_code == 200
    assert memo_resp.headers["content-type"] == "application/pdf"
    assert "X-Document-Checksum-SHA256" in memo_resp.headers
    assert len(memo_resp.headers["X-Document-Checksum-SHA256"]) == 64

    # 3c. Non-institution role cannot resubmit
    forbidden_resubmit = client.post(
        "/api/v1/applications/APP-2026-014/transition",
        headers={"Authorization": f"Bearer {scrutiny_token}"},
        json={"action": "resubmit"},
    )
    assert forbidden_resubmit.status_code == 403
    assert "cannot resubmit institution responses" in forbidden_resubmit.json()["detail"]

    # 4. Resubmit by institution with rectification remarks restores workflow to preserved resume stage
    resubmit_resp = client.post(
        "/api/v1/applications/APP-2026-014/transition",
        headers={"Authorization": f"Bearer {inst_token}"},
        json={
            "action": "resubmit",
            "remarks": "Uploaded revised architectural layout endorsed by chartered civil engineer.",
        },
    )
    assert resubmit_resp.status_code == 200
    resumed_data = resubmit_resp.json()
    assert resumed_data["stage"] == "EVC Scheduling"
    assert resumed_data["status"] == "In progress"
    assert resumed_data["owner_role"] == "Scrutiny Officer"

def test_evc_scheduling_and_report_flow():
    coordinator_token = get_auth_token("coordinator@aicte.gov.in")

    # 1. Schedule EVC visit
    sched_resp = client.post(
        "/api/v1/evc/EVC-023/schedule",
        headers={"Authorization": f"Bearer {coordinator_token}"},
        json={"visit_date": "2026-11-04", "panel": "Prof. S. Joshi, Dr. R. Verma"},
    )
    assert sched_resp.status_code == 200
    assert sched_resp.json()["status"] == "Scheduled"
    assert sched_resp.json()["visit_date"] == "2026-11-04"

    # 2. Submit EVC report findings
    report_resp = client.post(
        "/api/v1/evc/EVC-023/report",
        headers={"Authorization": f"Bearer {coordinator_token}"},
        json={"outcome": "Satisfactory", "remarks": "All facilities confirmed compliant."},
    )
    assert report_resp.status_code == 200
    assert report_resp.json()["status"] == "Completed"
    assert report_resp.json()["report_status"] == "Submitted"

def test_competent_authority_final_decision():
    authority_token = get_auth_token("authority@aicte.gov.in")

    # Record determination on APP-2026-031 which is in Decision Pending
    resp = client.post(
        "/api/v1/applications/APP-2026-031/transition",
        headers={"Authorization": f"Bearer {authority_token}"},
        json={"action": "decision", "decision": "Approved", "remarks": "Approved by Council order."},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["stage"] == "Approved"
    assert data["status"] == "Closed"

def test_compliance_submission_and_verification_separation():
    inst_token = get_auth_token("institution@shivneri.edu.in")
    regional_token = get_auth_token("regional@aicte.gov.in")

    # 1. Institution submits evidence
    sub_resp = client.post(
        "/api/v1/compliance/CMP-031/evidence",
        headers={"Authorization": f"Bearer {inst_token}"},
        json={"note": "Uploaded infrastructure inspection compliance affidavit."},
    )
    assert sub_resp.status_code == 200
    sub_data = sub_resp.json()
    assert sub_data["evidence_status"] == "Submitted"
    # Invariant: Submitting evidence does NOT equal verification!
    assert sub_data["verification"] == "Pending Verification"

    # 2. Institution user cannot self-verify (forbidden)
    self_verify_resp = client.post(
        "/api/v1/compliance/CMP-031/verify",
        headers={"Authorization": f"Bearer {inst_token}"},
        json={"verified": True, "remarks": "Self approval attempt"},
    )
    assert self_verify_resp.status_code == 403

    # 3. Regional Officer reviews and verifies evidence
    verify_resp = client.post(
        "/api/v1/compliance/CMP-031/verify",
        headers={"Authorization": f"Bearer {regional_token}"},
        json={"verified": True, "remarks": "Official scrutiny verified."},
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["verification"] == "Verified"

def test_audit_trail_streaming():
    token = get_auth_token("scrutiny@aicte.gov.in")
    resp = client.get(
        "/api/v1/audit/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    events = resp.json()
    assert len(events) > 0
    # Every event must have correlation ID
    for e in events:
        assert "correlation" in e
        assert e["correlation"].startswith("COR-")
