import hashlib
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


def test_get_electronic_case_summary_pdf():
    scrutiny_token = get_auth_token("scrutiny@aicte.gov.in")
    
    resp = client.get(
        "/api/v1/applications/APP-2026-014/summary",
        headers={"Authorization": f"Bearer {scrutiny_token}"},
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert "inline" in resp.headers["content-disposition"]
    assert "Case_Summary_APP-2026-014.pdf" in resp.headers["content-disposition"]
    assert "x-document-checksum-sha256" in resp.headers

    # Validate binary content is a genuine PDF
    content = resp.content
    assert content.startswith(b"%PDF-")
    expected_hash = hashlib.sha256(content).hexdigest()
    assert resp.headers["x-document-checksum-sha256"] == expected_hash


def test_unapproved_application_cannot_generate_eoa_400():
    scrutiny_token = get_auth_token("scrutiny@aicte.gov.in")

    # APP-2026-014 starts in Initial Scrutiny (not Approved)
    resp = client.get(
        "/api/v1/applications/APP-2026-014/letter?letter_type=eoa",
        headers={"Authorization": f"Bearer {scrutiny_token}"},
    )
    assert resp.status_code == 400
    assert "can only be generated for Approved applications" in resp.json()["detail"]


def test_generate_eoa_sanction_order_for_approved_application():
    ca_token = get_auth_token("authority@aicte.gov.in")
    scrutiny_token = get_auth_token("scrutiny@aicte.gov.in")

    # Fast-forward an application or record final decision
    # Check if there is an already approved app or transition one
    decide_resp = client.post(
        "/api/v1/applications/APP-2026-014/transition",
        headers={"Authorization": f"Bearer {ca_token}"},
        json={"action": "decision", "decision": "Approved", "remarks": "Statutory inspection satisfactory."},
    )
    assert decide_resp.status_code == 200
    assert decide_resp.json()["stage"] == "Approved"

    # Now generate the official Extension of Approval sanction letter
    eoa_resp = client.get(
        "/api/v1/applications/APP-2026-014/letter",
        headers={"Authorization": f"Bearer {scrutiny_token}"},
    )
    assert eoa_resp.status_code == 200
    assert eoa_resp.headers["content-type"] == "application/pdf"
    assert "Sanction_Order_EoA_APP-2026-014.pdf" in eoa_resp.headers["content-disposition"]
    assert eoa_resp.content.startswith(b"%PDF-")
    assert "x-document-checksum-sha256" in eoa_resp.headers


def test_deficiency_notice_generated_for_returned_application():
    scrutiny_token = get_auth_token("scrutiny@aicte.gov.in")

    # Return APP-2026-031 for deficiency under WF-02
    ret_resp = client.post(
        "/api/v1/applications/APP-2026-031/transition",
        headers={"Authorization": f"Bearer {scrutiny_token}"},
        json={
            "action": "return",
            "reason": "Building fire safety NOC expired. Faculty cadre ratio deficient in Computer Engineering.",
        },
    )
    assert ret_resp.status_code == 200
    assert ret_resp.json()["status"] == "Awaiting institution"

    # Fetch deficiency letter
    def_resp = client.get(
        "/api/v1/applications/APP-2026-031/letter",
        headers={"Authorization": f"Bearer {scrutiny_token}"},
    )
    assert def_resp.status_code == 200
    assert def_resp.headers["content-type"] == "application/pdf"
    assert "Deficiency_Notice_APP-2026-031.pdf" in def_resp.headers["content-disposition"]
    assert def_resp.content.startswith(b"%PDF-")


def test_summary_and_letter_for_nonexistent_application_404():
    scrutiny_token = get_auth_token("scrutiny@aicte.gov.in")

    resp_summary = client.get(
        "/api/v1/applications/APP-9999-NONEXISTENT/summary",
        headers={"Authorization": f"Bearer {scrutiny_token}"},
    )
    assert resp_summary.status_code == 404

    resp_letter = client.get(
        "/api/v1/applications/APP-9999-NONEXISTENT/letter",
        headers={"Authorization": f"Bearer {scrutiny_token}"},
    )
    assert resp_letter.status_code == 404
