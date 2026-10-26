import random
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user, require_roles
from app.models.user import User
from app.models.document import DocumentRecord
from app.models.audit import AuditEvent
from app.schemas.domain import (
    DocumentResponse, 
    DocumentRenewalRequest, 
    DocumentVerifyRequest
)

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
