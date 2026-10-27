import random
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user, require_roles
from app.models.user import User
from app.models.compliance import ComplianceObligation
from app.models.audit import AuditEvent
from app.schemas.domain import (
    ComplianceResponse, 
    EvidenceSubmitRequest, 
    EvidenceVerifyRequest,
    FileUploadResponse,
)
from app.core.storage import process_and_save_upload, resolve_stored_file

router = APIRouter()

def get_now_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")

def generate_correlation() -> str:
    return "COR-" + uuid.uuid4().hex[:7].upper()

@router.get("/", response_model=List[ComplianceResponse])
def get_compliance_obligations(
    verification: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(ComplianceObligation)
    if current_user.role == "Institution User" and current_user.institution_id:
        query = query.filter(ComplianceObligation.institution.ilike(f"%{current_user.institution_id}%") | (ComplianceObligation.app_id == "APP-2026-014"))

    if verification:
        query = query.filter(ComplianceObligation.verification == verification)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(ComplianceObligation.title.ilike(s) | ComplianceObligation.institution.ilike(s) | ComplianceObligation.app_id.ilike(s))

    return query.all()

@router.post("/{id}/upload", response_model=FileUploadResponse)
async def upload_compliance_evidence(
    id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles("Institution User", "System Operator")),
    db: Session = Depends(get_db),
):
    """
    Securely upload a compliance evidence binary (PDF/JPEG/PNG).
    Enforces 10MB limit, file format checks, and SHA-256 cryptographic checksum.
    """
    ob = db.query(ComplianceObligation).filter(ComplianceObligation.id == id).first()
    if not ob:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Obligation not found")

    result = await process_and_save_upload(file, entity_id=ob.id, subfolder="compliance")

    ob.file_name = result["file_name"]
    ob.file_path = result["file_path"]
    ob.file_size = result["file_size"]
    ob.mime_type = result["mime_type"]
    ob.checksum_sha256 = result["checksum_sha256"]
    ob.uploaded_at = get_now_stamp()
    ob.evidence_status = "Submitted"
    ob.verification = "Pending Verification"

    audit_entry = AuditEvent(
        id=f"AUD-{random.randint(1000, 9999)}",
        time=get_now_stamp(),
        actor=current_user.full_name,
        target=ob.id,
        event_type="Compliance",
        rule="CMP-SEC-01",
        detail=(
            f"Evidence binary uploaded for '{ob.title}': {result['file_name']} "
            f"({result['file_size']} bytes, SHA-256: {result['checksum_sha256'][:16]}...). "
            f"Verification pending statutory review."
        ),
        correlation=generate_correlation(),
    )

    db.add(audit_entry)
    db.commit()
    db.refresh(ob)

    return FileUploadResponse(
        id=ob.id,
        file_name=ob.file_name,
        file_path=ob.file_path,
        file_size=ob.file_size,
        mime_type=ob.mime_type,
        checksum_sha256=ob.checksum_sha256,
        preview_url=f"/api/v1/compliance/{ob.id}/file",
    )

@router.get("/{id}/file")
def stream_compliance_file(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Stream compliance evidence binary for in-browser previewing.
    """
    ob = db.query(ComplianceObligation).filter(ComplianceObligation.id == id).first()
    if not ob:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Obligation not found")

    if not ob.file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No evidence binary uploaded for this obligation.")

    resolved_path = resolve_stored_file(ob.file_path)

    return FileResponse(
        path=str(resolved_path),
        media_type=ob.mime_type or "application/pdf",
        filename=ob.file_name or "evidence.pdf",
        headers={
            "Content-Disposition": f'inline; filename="{ob.file_name or "evidence.pdf"}"',
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, max-age=3600",
        },
    )

@router.post("/{id}/evidence", response_model=ComplianceResponse)
def submit_evidence(
    id: str,
    req: EvidenceSubmitRequest,
    current_user: User = Depends(require_roles("Institution User", "System Operator")),
    db: Session = Depends(get_db),
):
    ob = db.query(ComplianceObligation).filter(ComplianceObligation.id == id).first()
    if not ob:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Obligation not found")

    ob.evidence_status = "Submitted"
    ob.verification = "Pending Verification"
    if req.note:
        ob.note = req.note

    audit_entry = AuditEvent(
        id=f"AUD-{random.randint(1000, 9999)}",
        time=get_now_stamp(),
        actor=current_user.full_name,
        target=ob.id,
        event_type="Compliance",
        rule="CMP-01",
        detail=f"Evidence submitted for '{ob.title}'. Verification pending statutory review.",
        correlation=generate_correlation(),
    )

    db.add(audit_entry)
    db.commit()
    db.refresh(ob)
    return ob

@router.post("/{id}/verify", response_model=ComplianceResponse)
def verify_evidence(
    id: str,
    req: EvidenceVerifyRequest,
    current_user: User = Depends(require_roles("Regional Officer", "Competent Authority", "System Operator")),
    db: Session = Depends(get_db),
):
    ob = db.query(ComplianceObligation).filter(ComplianceObligation.id == id).first()
    if not ob:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Obligation not found")

    outcome = "Verified" if req.verified else "Rejected / clarification"
    ob.verification = outcome

    audit_entry = AuditEvent(
        id=f"AUD-{random.randint(1000, 9999)}",
        time=get_now_stamp(),
        actor=current_user.full_name,
        target=ob.id,
        event_type="Compliance",
        rule="CMP-01",
        detail=f"Official determination recorded for '{ob.title}': {outcome}. Remarks: '{req.remarks or 'None'}'.",
        correlation=generate_correlation(),
    )

    db.add(audit_entry)
    db.commit()
    db.refresh(ob)
    return ob
