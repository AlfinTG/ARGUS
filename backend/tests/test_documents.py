import io
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


def test_upload_valid_pdf_document():
    token = get_auth_token("institution@shivneri.edu.in")
    
    # Valid PDF content with magic bytes
    pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Title (Fire Safety NOC 2026) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    expected_hash = hashlib.sha256(pdf_content).hexdigest()
    
    files = {
        "file": ("fire_safety_noc_2026.pdf", io.BytesIO(pdf_content), "application/pdf")
    }
    
    resp = client.post(
        "/api/v1/documents/DOC-001/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "DOC-001"
    assert data["file_name"] == "fire_safety_noc_2026.pdf"
    assert data["file_size"] == len(pdf_content)
    assert data["mime_type"] == "application/pdf"
    assert data["checksum_sha256"] == expected_hash
    assert data["preview_url"] == "/api/v1/documents/DOC-001/file"

    # Verify document record status in list endpoint
    doc_resp = client.get(
        "/api/v1/documents/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert doc_resp.status_code == 200
    doc_records = {d["id"]: d for d in doc_resp.json()}
    assert "DOC-001" in doc_records
    assert doc_records["DOC-001"]["renewal_status"] == "Submitted"
    assert doc_records["DOC-001"]["review_status"] == "Pending Verification"
    assert doc_records["DOC-001"]["checksum_sha256"] == expected_hash


def test_upload_valid_jpeg_and_png():
    token = get_auth_token("institution@shivneri.edu.in")
    
    # JPEG with SOI marker (\xFF\xD8\xFF)
    jpeg_bytes = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xFF\xDB\x00C\x00\xFF\xD9"
    jpeg_hash = hashlib.sha256(jpeg_bytes).hexdigest()
    
    resp_jpeg = client.post(
        "/api/v1/documents/DOC-002/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("land_deed_scan.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")},
    )
    assert resp_jpeg.status_code == 200
    assert resp_jpeg.json()["checksum_sha256"] == jpeg_hash
    assert resp_jpeg.json()["mime_type"] == "image/jpeg"

    # PNG with PNG signature (\x89PNG\r\n\x1a\n)
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    png_hash = hashlib.sha256(png_bytes).hexdigest()
    
    resp_png = client.post(
        "/api/v1/documents/DOC-003/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("society_certificate.png", io.BytesIO(png_bytes), "image/png")},
    )
    assert resp_png.status_code == 200
    assert resp_png.json()["checksum_sha256"] == png_hash
    assert resp_png.json()["mime_type"] == "image/png"


def test_upload_exceeding_10mb_rejected_413():
    token = get_auth_token("institution@shivneri.edu.in")
    
    # 10MB + 128 bytes oversized dummy payload
    oversized_length = 10 * 1024 * 1024 + 128
    oversized_stream = io.BytesIO(b"%PDF-1.4\n" + b"A" * (oversized_length - 9))
    
    resp = client.post(
        "/api/v1/documents/DOC-001/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("huge_document.pdf", oversized_stream, "application/pdf")},
    )
    assert resp.status_code == 413
    assert "10MB" in resp.json()["detail"]


def test_upload_unsupported_media_type_rejected_415():
    token = get_auth_token("institution@shivneri.edu.in")
    
    # Executable / Shell script
    exe_file = io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00")
    resp_exe = client.post(
        "/api/v1/documents/DOC-001/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("malicious_payload.exe", exe_file, "application/x-msdownload")},
    )
    assert resp_exe.status_code == 415

    # Text file (.txt)
    txt_file = io.BytesIO(b"Plain text note without PDF header")
    resp_txt = client.post(
        "/api/v1/documents/DOC-001/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("notes.txt", txt_file, "text/plain")},
    )
    assert resp_txt.status_code == 415


def test_malicious_filename_sanitization():
    token = get_auth_token("institution@shivneri.edu.in")
    
    pdf_content = b"%PDF-1.4\nSample secure document content\n%%EOF"
    
    # Path traversal attack in filename
    traversal_filename = "../../../../../etc/passwd.pdf"
    resp = client.post(
        "/api/v1/documents/DOC-001/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": (traversal_filename, io.BytesIO(pdf_content), "application/pdf")},
    )
    assert resp.status_code == 200
    sanitized_name = resp.json()["file_name"]
    # Path traversal characters should be stripped
    assert ".." not in sanitized_name
    assert "/" not in sanitized_name
    assert "\\" not in sanitized_name
    assert sanitized_name.endswith(".pdf")


def test_stream_document_file_preview():
    token = get_auth_token("institution@shivneri.edu.in")
    scrutiny_token = get_auth_token("scrutiny@aicte.gov.in")
    
    pdf_content = b"%PDF-1.4\nAICTE Stream Preview Test\n%%EOF"
    
    # Upload first
    client.post(
        "/api/v1/documents/DOC-001/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("compliance_preview.pdf", io.BytesIO(pdf_content), "application/pdf")},
    )
    
    # Stream for scrutiny officer preview
    stream_resp = client.get(
        "/api/v1/documents/DOC-001/file",
        headers={"Authorization": f"Bearer {scrutiny_token}"},
    )
    assert stream_resp.status_code == 200
    assert stream_resp.headers["content-type"] == "application/pdf"
    assert "inline" in stream_resp.headers["content-disposition"]
    assert stream_resp.headers["x-content-type-options"] == "nosniff"
    assert stream_resp.content == pdf_content


def test_compliance_evidence_upload_and_preview():
    token = get_auth_token("institution@shivneri.edu.in")
    ro_token = get_auth_token("regional@aicte.gov.in")
    
    pdf_content = b"%PDF-1.4\nFaculty Appointment Affidavit Evidence\n%%EOF"
    expected_hash = hashlib.sha256(pdf_content).hexdigest()
    
    resp_upload = client.post(
        "/api/v1/compliance/CMP-014/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("faculty_undertaking_affidavit.pdf", io.BytesIO(pdf_content), "application/pdf")},
    )
    assert resp_upload.status_code == 200
    data = resp_upload.json()
    assert data["checksum_sha256"] == expected_hash
    assert data["preview_url"] == "/api/v1/compliance/CMP-014/file"

    # Preview stream
    resp_file = client.get(
        "/api/v1/compliance/CMP-014/file",
        headers={"Authorization": f"Bearer {ro_token}"},
    )
    assert resp_file.status_code == 200
    assert resp_file.content == pdf_content


def test_unauthorized_upload_rejected():
    # Committee Coordinator is not permitted to upload institutional documents
    coord_token = get_auth_token("coordinator@aicte.gov.in")
    
    pdf_content = b"%PDF-1.4\nTest\n%%EOF"
    resp = client.post(
        "/api/v1/documents/DOC-001/upload",
        headers={"Authorization": f"Bearer {coord_token}"},
        files={"file": ("unauthorized.pdf", io.BytesIO(pdf_content), "application/pdf")},
    )
    assert resp.status_code == 403

    # No token at all -> 401
    resp_anon = client.post(
        "/api/v1/documents/DOC-001/upload",
        files={"file": ("anon.pdf", io.BytesIO(pdf_content), "application/pdf")},
    )
    assert resp_anon.status_code == 401
