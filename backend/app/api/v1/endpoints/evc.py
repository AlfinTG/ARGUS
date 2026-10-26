import random
import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user, require_roles
from app.models.user import User
from app.models.evc import EVCTask
from app.models.application import Application
from app.models.audit import AuditEvent
from app.schemas.domain import (
    EVCTaskResponse, 
    EVCScheduleRequest, 
    EVCReportRequest,
    ROUTES,
)

router = APIRouter()

def get_now_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")

def generate_correlation() -> str:
    return "COR-" + uuid.uuid4().hex[:7].upper()

@router.get("/", response_model=List[EVCTaskResponse])
def get_evc_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(EVCTask).all()

@router.post("/{id}/schedule", response_model=EVCTaskResponse)
def schedule_evc_visit(
    id: str,
    req: EVCScheduleRequest,
    current_user: User = Depends(require_roles("Committee Coordinator", "System Operator")),
    db: Session = Depends(get_db),
):
    evc = db.query(EVCTask).filter(EVCTask.id == id).first()
    if not evc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EVC task not found")

    evc.visit_date = req.visit_date
    evc.panel = req.panel
    evc.status = "Scheduled"

    audit_entry = AuditEvent(
        id=f"AUD-{random.randint(1000, 9999)}",
        time=get_now_stamp(),
        actor=current_user.full_name,
        target=evc.id,
        event_type="EVC",
        rule="EVC-01",
        detail=f"EVC visit scheduled for {req.visit_date}. Assigned panel: '{req.panel}'.",
        correlation=generate_correlation(),
    )

    db.add(audit_entry)
    db.commit()
    db.refresh(evc)
    return evc

@router.post("/{id}/report", response_model=EVCTaskResponse)
def submit_evc_report(
    id: str,
    req: EVCReportRequest,
    current_user: User = Depends(require_roles("Committee Coordinator", "System Operator")),
    db: Session = Depends(get_db),
):
    evc = db.query(EVCTask).filter(EVCTask.id == id).first()
    if not evc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EVC task not found")

    evc.report_status = "Submitted"
    evc.status = "Completed"

    # Also advance the linked application to its next route stage
    app = db.query(Application).filter(Application.id == evc.app_id).first()
    if app:
        route_seq = ROUTES.get(app.route, [])
        try:
            curr_idx = route_seq.index(app.stage)
            if curr_idx < len(route_seq) - 1:
                next_stage = route_seq[curr_idx + 1]
                app.stage = next_stage
                app.status = "Decision pending" if next_stage == "Decision Pending" else "In progress"
                app.owner_role = "Competent Authority" if next_stage == "Decision Pending" else app.owner_role
                app.updated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        except ValueError:
            pass

    audit_entry = AuditEvent(
        id=f"AUD-{random.randint(1000, 9999)}",
        time=get_now_stamp(),
        actor=current_user.full_name,
        target=evc.id,
        event_type="EVC",
        rule="EVC-02",
        detail=f"EVC report submitted: {req.outcome}. Remarks: '{req.remarks or 'None'}'. Associated application stage advanced.",
        correlation=generate_correlation(),
    )

    db.add(audit_entry)
    db.commit()
    db.refresh(evc)
    return evc
