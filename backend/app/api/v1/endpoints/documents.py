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
from app.models.document import DocumentRecord
from app.models.audit import AuditEvent
from app.schemas.domain import (
    DocumentResponse, 
    DocumentRenewalRequest, 
    DocumentVerifyRequest,
    FileUploadResponse,
)
from app.core.storage import process_and_save_upload, resolve_stored_file

router = APIRouter()

def get_now_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")

def generate_correlation() -> str:
    return "COR-" + uuid.uuid4().hex[:7].upper()

@router.get("/", response_model=List[DocumentResponse])
def get_documents(
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(DocumentRecord)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(DocumentRecord.title.ilike(s) | DocumentRecord.institution.ilike(s))
    return query.all()

@router.post("/{id}/upload", response_model=FileUploadResponse)
async def upload_document_binary(
    id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles("Institution User", "System Operator")),
    db: Session = Depends(get_db),
):
    """
    Securely upload a PDF/JPEG/PNG renewal binary for a document record.
    Performs 10MB limit enforcement, MIME validation, filename sanitization,
    and SHA-256 cryptographic digest computation.
    """
    doc = db.query(DocumentRecord).filter(DocumentRecord.id == id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document record not found")

    result = await process_and_save_upload(file, entity_id=doc.id, subfolder="documents")

    doc.file_name = result["file_name"]
    doc.file_path = result["file_path"]
    doc.file_size = result["file_size"]
    doc.mime_type = result["mime_type"]
    doc.checksum_sha256 = result["checksum_sha256"]
    doc.uploaded_at = get_now_stamp()
    doc.renewal_status = "Submitted"
    doc.review_status = "Pending Verification"

    audit_entry = AuditEvent(
        id=f"AUD-{random.randint(1000, 9999)}",
        time=get_now_stamp(),
        actor=current_user.full_name,
        target=doc.id,
        event_type="Document",
        rule="DOC-SEC-01",
        detail=(
            f"Binary document uploaded for '{doc.title}': {result['file_name']} "
            f"({result['file_size']} bytes, SHA-256: {result['checksum_sha256'][:16]}...). "
            f"Pending scrutiny verification."
        ),
        correlation=generate_correlation(),
    )

    db.add(audit_entry)
    db.commit()
    db.refresh(doc)

    return FileUploadResponse(
        id=doc.id,
        file_name=doc.file_name,
        file_path=doc.file_path,
        file_size=doc.file_size,
        mime_type=doc.mime_type,
        checksum_sha256=doc.checksum_sha256,
        preview_url=f"/api/v1/documents/{doc.id}/file",
    )

@router.get("/{id}/file")
def stream_document_file(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Stream the stored binary file for in-browser PDF/image preview.
    Includes security headers to prevent sniffing or traversal.
    """
    doc = db.query(DocumentRecord).filter(DocumentRecord.id == id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document record not found")

    if not doc.file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No binary file uploaded for this document record.")

    resolved_path = resolve_stored_file(doc.file_path)

    return FileResponse(
        path=str(resolved_path),
        media_type=doc.mime_type or "application/pdf",
        filename=doc.file_name or "document.pdf",
        headers={
            "Content-Disposition": f'inline; filename="{doc.file_name or "document.pdf"}"',
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, max-age=3600",
        },
    )

@router.post("/{id}/renewal", response_model=DocumentResponse)
def submit_document_renewal(
    id: str,
    req: DocumentRenewalRequest,
    current_user: User = Depends(require_roles("Institution User", "System Operator")),
    db: Session = Depends(get_db),
):
    doc = db.query(DocumentRecord).filter(DocumentRecord.id == id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document record not found")

    doc.renewal_status = "Submitted"
    doc.review_status = "Pending Verification"

    audit_entry = AuditEvent(
        id=f"AUD-{random.randint(1000, 9999)}",
        time=get_now_stamp(),
        actor=current_user.full_name,
        target=doc.id,
        event_type="Document",
        rule="DOC-01",
        detail=f"Renewal filing uploaded for '{doc.title}' (Ref: {req.document_ref}). Official review pending.",
        correlation=generate_correlation(),
    )

    db.add(audit_entry)
    db.commit()
    db.refresh(doc)
    return doc

@router.post("/{id}/verify", response_model=DocumentResponse)
def verify_document_renewal(
    id: str,
    req: DocumentVerifyRequest,
    current_user: User = Depends(require_roles("Regional Officer", "Competent Authority", "System Operator")),
    db: Session = Depends(get_db),
):
    doc = db.query(DocumentRecord).filter(DocumentRecord.id == id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document record not found")

    if req.verified:
        doc.renewal_status = "Verified"
        doc.review_status = "Verified"
        doc.expiry_date = "2027-10-26"
    else:
        doc.renewal_status = "Not submitted"
        doc.review_status = "Not reviewed"

    audit_entry = AuditEvent(
        id=f"AUD-{random.randint(1000, 9999)}",
        time=get_now_stamp(),
        actor=current_user.full_name,
        target=doc.id,
        event_type="Document",
        rule="DOC-01",
        detail=f"Renewal verification for '{doc.title}': {'Accepted & extended to 2027-10-26' if req.verified else 'Rejected'}. Remarks: '{req.remarks or 'None'}'.",
        correlation=generate_correlation(),
    )

    db.add(audit_entry)
    db.commit()
    db.refresh(doc)
    return doc
