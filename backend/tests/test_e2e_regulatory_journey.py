"""
Phase 5 & Full End-to-End Regulatory Journey Test Suite
======================================================
Tests the complete multi-actor AICTE statutory lifecycle:
  1. Phase 1: Institutional Application Filing (College Principal / Nodal Officer)
  2. Phase 2: Scrutiny Officer Verification & Stage Progression
  3. Phase 3: Expert Visit Committee (EVC) Scheduling & Rubric Report
  4. Phase 4: Regional Office Review, Compliance Verification & Endorsement
  5. Phase 5: Competent Authority Final Determination & EoA Sanction PDF Generation
"""

import hashlib
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


def institution() -> dict:
    return _token("institution@shivneri.edu.in")

def scrutiny() -> dict:
    return _token("scrutiny@aicte.gov.in")

def coordinator() -> dict:
    return _token("coordinator@aicte.gov.in")

def regional() -> dict:
    return _token("regional@aicte.gov.in")

def authority() -> dict:
    return _token("authority@aicte.gov.in")


def test_complete_end_to_end_regulatory_journey_approval():
    """
    Simulates the entire regulatory lifecycle from institution filing through
    scrutiny, EVC, regional endorsement, and final EoA sanction order generation.
    """
    # ── STEP 1: Institutional Application Filing (Phase 1) ────────────────────
    payload = {
        "aicte_permanent_id": "1-9876543210",
        "institution_name": "Shivneri Institute of Engineering & Technology",
        "region": "Western",
        "route": "Scrutiny + EVC",
        "app_type": "Extension of Approval (EoA)",
        "due_date": "2026-11-30",
        "courses": [
            {
                "program": "Engineering & Technology",
                "level": "UG",
                "title": "Computer Science & Engineering",
                "intake": 120,
            },
            {
                "program": "Engineering & Technology",
                "level": "UG",
                "title": "Artificial Intelligence & Data Science",
                "intake": 60,
            },
        ],
        "documents": [
            {
                "doc_type": "registered_lease_deed",
                "title": "Registered Land Lease Deed",
                "file_name": "land_lease_deed.pdf",
                "checksum_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                "file_size": 204800,
            },
            {
                "doc_type": "fire_safety_noc",
                "title": "Fire Safety NOC Certificate",
                "file_name": "fire_safety_noc.pdf",
                "checksum_sha256": "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
                "file_size": 102400,
            },
            {
                "doc_type": "faculty_cadre_undertaking",
                "title": "Faculty Cadre & AICTE Pay Scale Undertaking",
                "file_name": "faculty_undertaking.pdf",
                "checksum_sha256": "4e1243bd22c66e76c2ba9eddc1f91394e57f9f8350b91d348a1e27cfbf3964ff",
                "file_size": 153600,
            },
        ],
        "affidavit_accepted": True,
        "signatory_designation": "Principal / Director",
    }

    filing_resp = client.post(
        "/api/v1/applications/institutional-filing",
        headers=institution(),
        json=payload,
    )
    assert filing_resp.status_code == 201, filing_resp.text
    filing_data = filing_resp.json()
    app_id = filing_data["application"]["id"]
    assert app_id.startswith("APP-2026-")
    assert filing_data["application"]["stage"] == "Initial Scrutiny"
    assert filing_data["correlation_token"].startswith("COR-")
    assert filing_data["total_intake"] == 180

    # ── STEP 2: Scrutiny Officer Verification & Stage Progression (Phase 2) ───
    # Scrutiny officer advances stage to EVC Scheduling
    stage_resp = client.post(
        f"/api/v1/applications/{app_id}/transition",
        headers=scrutiny(),
        json={"action": "complete"},
    )
    assert stage_resp.status_code == 200
    assert stage_resp.json()["stage"] == "EVC Scheduling"

    # Find the linked EVC record
    evc_list_resp = client.get("/api/v1/evc/", headers=coordinator())
    assert evc_list_resp.status_code == 200
    evc_task = next((e for e in evc_list_resp.json() if e["app_id"] == app_id), None)
    assert evc_task is not None, f"No EVC task generated for {app_id}"
    evc_id = evc_task["id"]

    # ── STEP 3: Expert Visit Committee Scheduling & Report (Phase 3) ──────────
    sched_resp = client.post(
        f"/api/v1/evc/{evc_id}/schedule",
        headers=coordinator(),
        json={
            "visit_date": "2026-11-15",
            "panel": "Prof. R. Sharma (Chairman), Dr. K. Patel (Expert)",
            "inspection_mode": "Physical Visit",
        },
    )
    assert sched_resp.status_code == 200
    assert sched_resp.json()["status"] == "Scheduled"

    report_resp = client.post(
        f"/api/v1/evc/{evc_id}/report",
        headers=coordinator(),
        json={
            "outcome": "Satisfactory",
            "remarks": "On-site physical inspection complete. All laboratories and faculty cadre verified.",
            "infrastructure_ok": True,
            "laboratories_ok": True,
            "library_ok": True,
            "faculty_cadre_ok": True,
        },
    )
    assert report_resp.status_code == 200
    assert report_resp.json()["status"] == "Completed"

    # App stage should now be EVC Report Review
    app_get_resp = client.get("/api/v1/applications/", headers=regional())
    app_after_evc = next(a for a in app_get_resp.json() if a["id"] == app_id)
    assert app_after_evc["stage"] == "EVC Report Review"

    # ── STEP 4: Regional Office Review & Endorsement (Phase 4) ─────────────────
    reg_review_resp = client.post(
        f"/api/v1/applications/{app_id}/regional-review",
        headers=regional(),
        json={
            "recommendation": "Endorse",
            "remarks": "Regional Office dossier inspection satisfactory. Committee report accepted in full. Recommending final statutory approval.",
        },
    )
    assert reg_review_resp.status_code == 200
    app_after_reg = reg_review_resp.json()
    assert app_after_reg["stage"] == "Decision Pending"
    assert app_after_reg["status"] == "Decision pending"

    # ── STEP 5: Competent Authority Final Determination & EoA (Phase 5) ───────
    decision_resp = client.post(
        f"/api/v1/applications/{app_id}/transition",
        headers=authority(),
        json={
            "action": "decision",
            "decision": "Approved",
            "remarks": "Approved by order of the Council. Extension of Approval granted for Academic Year 2026-27.",
        },
    )
    assert decision_resp.status_code == 200
    decision_data = decision_resp.json()
    assert decision_data["stage"] == "Approved"
    assert decision_data["status"] == "Closed"

    # Download official Extension of Approval (EoA) Sanction Order PDF
    eoa_resp = client.get(
        f"/api/v1/applications/{app_id}/letter?letter_type=eoa",
        headers=institution(),
    )
    assert eoa_resp.status_code == 200
    assert eoa_resp.headers["content-type"] == "application/pdf"
    assert f"Sanction_Order_EoA_{app_id}.pdf" in eoa_resp.headers["content-disposition"]
    pdf_bytes = eoa_resp.content
    assert pdf_bytes.startswith(b"%PDF-")
    expected_hash = hashlib.sha256(pdf_bytes).hexdigest()
    assert eoa_resp.headers["x-document-checksum-sha256"] == expected_hash

    # Download Electronic Case Summary (ECS)
    summary_resp = client.get(
        f"/api/v1/applications/{app_id}/summary",
        headers=institution(),
    )
    assert summary_resp.status_code == 200
    assert summary_resp.content.startswith(b"%PDF-")


def test_competent_authority_rejection_lifecycle():
    """
    Verifies that a Competent Authority rejection correctly transitions the
    application to Rejected/Closed status and generates a Rejection Order PDF.
    """
    # APP-2026-031 is seeded in Decision Pending
    ca_token = authority()
    decide_resp = client.post(
        "/api/v1/applications/APP-2026-031/transition",
        headers=ca_token,
        json={
            "action": "decision",
            "decision": "Rejected",
            "remarks": "Rejected due to unresolved statutory land ownership encumbrances under APH Clause 3.4.",
        },
    )
    assert decide_resp.status_code == 200
    data = decide_resp.json()
    assert data["stage"] == "Rejected"
    assert data["status"] == "Rejected"

    # Fetch Rejection Order PDF
    rej_letter_resp = client.get(
        "/api/v1/applications/APP-2026-031/letter",
        headers=ca_token,
    )
    assert rej_letter_resp.status_code == 200
    assert rej_letter_resp.headers["content-type"] == "application/pdf"
    assert rej_letter_resp.content.startswith(b"%PDF-")
    assert "Rejection_Order_APP-2026-031.pdf" in rej_letter_resp.headers["content-disposition"]


def test_non_authority_roles_cannot_record_final_decision():
    """
    Ensures that only Competent Authority and System Operator can record
    final statutory decisions.
    """
    for role_token in [institution(), scrutiny(), coordinator(), regional()]:
        resp = client.post(
            "/api/v1/applications/APP-2026-014/transition",
            headers=role_token,
            json={"action": "decision", "decision": "Approved", "remarks": "Unauthorized decision attempt."},
        )
        assert resp.status_code == 403
