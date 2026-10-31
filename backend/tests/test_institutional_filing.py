import hashlib
from fastapi.testclient import TestClient
from app.main import app
from app.models.application import Application
from app.models.document import DocumentRecord
from app.models.compliance import ComplianceObligation
from app.models.audit import AuditEvent

client = TestClient(app)

def get_auth_token(email: str) -> str:
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Demo@2026!"},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]

def sample_hash(name: str) -> str:
    return hashlib.sha256(name.encode("utf-8")).hexdigest()

def make_valid_payload():
    return {
        "aicte_permanent_id": "1-9876543210",
        "institution_name": "Maharashtra Institute of Technology",
        "region": "West",
        "route": "Scrutiny + EVC",
        "app_type": "Extension of Approval (EoA)",
        "due_date": "2026-11-30",
        "courses": [
            {
                "program": "B.E / B.Tech",
                "level": "UG",
                "title": "Computer Engineering",
                "intake": 120,
            },
            {
                "program": "M.E / M.Tech",
                "level": "PG",
                "title": "Artificial Intelligence & Data Science",
                "intake": 30,
            },
        ],
        "documents": [
            {
                "doc_type": "registered_lease_deed",
                "title": "Registered Lease Deed",
                "file_name": "lease_deed_2026.pdf",
                "checksum_sha256": sample_hash("lease_deed"),
                "file_size": 245000,
            },
            {
                "doc_type": "fire_safety_noc",
                "title": "Fire Safety NOC",
                "file_name": "fire_noc_2026.pdf",
                "checksum_sha256": sample_hash("fire_noc"),
                "file_size": 182000,
            },
            {
                "doc_type": "faculty_cadre_undertaking",
                "title": "Faculty Cadre Undertaking",
                "file_name": "faculty_undertaking_2026.pdf",
                "checksum_sha256": sample_hash("faculty_cadre"),
                "file_size": 95000,
            },
        ],
        "affidavit_accepted": True,
        "signatory_designation": "Principal & Secretary",
    }

def test_institutional_filing_success(db_session):
    inst_token = get_auth_token("institution@shivneri.edu.in")
    payload = make_valid_payload()

    resp = client.post(
        "/api/v1/applications/institutional-filing",
        headers={"Authorization": f"Bearer {inst_token}"},
        json=payload,
    )
    assert resp.status_code == 201
    data = resp.json()

    assert data["correlation_token"].startswith("COR-")
    assert data["total_intake"] == 150
    assert data["courses_count"] == 2
    assert data["documents_count"] == 3

    app_data = data["application"]
    app_id = app_data["id"]
    assert app_id.startswith("APP-2026-")
    assert app_data["stage"] == "Initial Scrutiny"
    assert app_data["status"] == "Under Scrutiny"
    assert app_data["route"] == "Scrutiny + EVC"
    assert "Maharashtra Institute of Technology" in app_data["institution"]

    # Verify database persistence: Application
    db_app = db_session.query(Application).filter(Application.id == app_id).first()
    assert db_app is not None
    assert db_app.stage == "Initial Scrutiny"

    # Verify database persistence: Linked Documents
    db_docs = db_session.query(DocumentRecord).filter(
        DocumentRecord.institution.ilike(f"%{payload['aicte_permanent_id']}%")
    ).all()
    assert len(db_docs) == 3
    doc_titles = {d.title for d in db_docs}
    assert "Registered Lease Deed" in doc_titles
    assert "Fire Safety NOC" in doc_titles
    assert "Faculty Cadre Undertaking" in doc_titles
    for d in db_docs:
        assert d.review_status == "Pending Verification"
        assert len(d.checksum_sha256) == 64

    # Verify database persistence: Linked Compliance Obligations
    db_cmps = db_session.query(ComplianceObligation).filter(
        ComplianceObligation.app_id == app_id
    ).all()
    assert len(db_cmps) == 2
    cmp_titles = {c.title for c in db_cmps}
    assert any("Computer Engineering" in t for t in cmp_titles)
    assert any("Artificial Intelligence" in t for t in cmp_titles)

    # Verify database persistence: Audit Event
    audit = db_session.query(AuditEvent).filter(
        AuditEvent.target == app_id,
        AuditEvent.rule == "WF-FILING"
    ).first()
    assert audit is not None
    assert audit.correlation == data["correlation_token"]
    assert "Principal & Secretary" in audit.detail

def test_filing_rejected_without_affidavit():
    inst_token = get_auth_token("institution@shivneri.edu.in")
    payload = make_valid_payload()
    payload["affidavit_accepted"] = False

    resp = client.post(
        "/api/v1/applications/institutional-filing",
        headers={"Authorization": f"Bearer {inst_token}"},
        json=payload,
    )
    assert resp.status_code == 422
    assert "affidavit" in resp.json()["detail"].lower()

def test_filing_rejected_with_zero_intake():
    inst_token = get_auth_token("institution@shivneri.edu.in")
    payload = make_valid_payload()
    payload["courses"][0]["intake"] = 0

    resp = client.post(
        "/api/v1/applications/institutional-filing",
        headers={"Authorization": f"Bearer {inst_token}"},
        json=payload,
    )
    assert resp.status_code == 422
    assert "invalid intake" in resp.json()["detail"].lower()

def test_filing_rejected_missing_statutory_doc():
    inst_token = get_auth_token("institution@shivneri.edu.in")
    payload = make_valid_payload()
    # Remove Fire Safety NOC
    payload["documents"] = [
        d for d in payload["documents"] if d["doc_type"] != "fire_safety_noc"
    ]

    resp = client.post(
        "/api/v1/applications/institutional-filing",
        headers={"Authorization": f"Bearer {inst_token}"},
        json=payload,
    )
    assert resp.status_code == 422
    assert "fire_safety_noc" in resp.json()["detail"]

def test_filing_rejected_invalid_sha256():
    inst_token = get_auth_token("institution@shivneri.edu.in")
    payload = make_valid_payload()
    payload["documents"][0]["checksum_sha256"] = "invalid_short_hash"

    resp = client.post(
        "/api/v1/applications/institutional-filing",
        headers={"Authorization": f"Bearer {inst_token}"},
        json=payload,
    )
    assert resp.status_code == 422
    assert "sha-256" in resp.json()["detail"].lower()

def test_filing_forbidden_for_scrutiny_officer():
    scrutiny_token = get_auth_token("scrutiny@aicte.gov.in")
    payload = make_valid_payload()

    resp = client.post(
        "/api/v1/applications/institutional-filing",
        headers={"Authorization": f"Bearer {scrutiny_token}"},
        json=payload,
    )
    assert resp.status_code == 403
    assert "Action not permitted for role 'Scrutiny Officer'" in resp.json()["detail"]
