from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.audit import AuditEvent
from app.schemas.domain import AuditEventResponse

router = APIRouter()

@router.get("/", response_model=List[AuditEventResponse])
def get_audit_trail(
    event_type: Optional[str] = None,
    target: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(AuditEvent)

    if event_type:
        query = query.filter(AuditEvent.event_type == event_type)
    if target:
        query = query.filter(AuditEvent.target == target)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            AuditEvent.detail.ilike(s) | 
            AuditEvent.actor.ilike(s) | 
            AuditEvent.correlation.ilike(s)
        )

    # Order newest first
    return query.order_by(AuditEvent.id.desc()).limit(200).all()
