import random
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.alert import Alert
from app.models.audit import AuditEvent
from app.schemas.rules import AlertResponse, AlertActionRequest

router = APIRouter()

def get_now_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")

def generate_correlation() -> str:
    return "COR-" + uuid.uuid4().hex[:7].upper()

@router.get("/", response_model=List[AlertResponse])
def get_alerts(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: Open, Acknowledged, Resolved"),
    target: Optional[str] = Query(None, description="Filter by target ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve actionable alert items with optional status/target filtering."""
    query = db.query(Alert)

    # Scoping for Institution User
    if current_user.role == "Institution User":
        query = query.filter(Alert.recipient_role == "Institution User")

    if status_filter:
        query = query.filter(Alert.status.ilike(status_filter.strip()))

    if target:
        query = query.filter(Alert.target == target.strip())

    return query.order_by(Alert.created_at.desc()).all()

@router.post("/{id}/ack", response_model=AlertResponse)
def acknowledge_alert(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark an active alert as Acknowledged and record the event in the audit trail."""
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    if current_user.role == "Institution User" and alert.recipient_role != "Institution User":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Institution users can only acknowledge alerts addressed to them.",
        )

    alert.status = "Acknowledged"

    audit = AuditEvent(
        id=f"AUD-{random.randint(1000, 9999)}",
        time=get_now_stamp(),
        actor=current_user.full_name,
        target=alert.target,
        event_type="Alert",
        rule=alert.rule_id,
        detail=f"Alert {alert.id} ({alert.title}) acknowledged by {current_user.role}.",
        correlation=generate_correlation(),
    )

    db.add(audit)
    db.commit()
    db.refresh(alert)
    return alert

@router.post("/{id}/resolve", response_model=AlertResponse)
def resolve_alert(
    id: str,
    req: Optional[AlertActionRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark an alert as Resolved and log the resolution action in the audit trail."""
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    if current_user.role == "Institution User" and alert.recipient_role != "Institution User":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Institution users can only resolve alerts addressed to them.",
        )

    alert.status = "Resolved"
    note_text = f" Note: {req.note.strip()}" if req and req.note and req.note.strip() else ""

    audit = AuditEvent(
        id=f"AUD-{random.randint(1000, 9999)}",
        time=get_now_stamp(),
        actor=current_user.full_name,
        target=alert.target,
        event_type="Alert",
        rule=alert.rule_id,
        detail=f"Alert {alert.id} ({alert.title}) resolved by {current_user.role}.{note_text}",
        correlation=generate_correlation(),
    )

    db.add(audit)
    db.commit()
    db.refresh(alert)
    return alert
