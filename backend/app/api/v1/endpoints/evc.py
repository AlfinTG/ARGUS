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

    if not req.visit_date or not req.visit_date.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inspection visit date is required.")

    if not req.panel or not req.panel.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned expert panel members are required.")

    evc.visit_date = req.visit_date.strip()
    evc.panel = req.panel.strip()
    evc.status = "Scheduled"

    audit_entry = AuditEvent(
        id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
        time=get_now_stamp(),
        actor=current_user.full_name,
        target=evc.id,
        event_type="EVC",
        rule="EVC-01",
        detail=(
            f"EVC visit scheduled for {req.visit_date} (Mode: {req.inspection_mode or 'Physical Visit'}). "
            f"Assigned panel: '{req.panel.strip()}'."
        ),
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

    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Update linked application based on inspection outcome
    app = db.query(Application).filter(Application.id == evc.app_id).first()
    if app:
        if req.outcome == "Deficiencies Noted":
            app.status = "Action required"
            app.return_reason = req.remarks or "Deficiencies noted during EVC inspection."
            app.updated_at = now_str
        else:
            route_seq = ROUTES.get(app.route, [])
            try:
                curr_idx = route_seq.index(app.stage)
                if curr_idx < len(route_seq) - 1:
                    next_stage = route_seq[curr_idx + 1]
                    app.stage = next_stage
                    if next_stage == "Decision Pending":
                        app.status = "Decision pending"
                        app.owner_role = "Competent Authority"
                    elif next_stage == "EVC Report Review":
                        app.status = "In progress"
                        app.owner_role = "Regional Officer"
                    elif next_stage == "SAC/SHC Review":
                        app.status = "In progress"
                        app.owner_role = "Regional Officer"
                    else:
                        app.status = "In progress"
                    app.updated_at = now_str
            except ValueError:
                pass

    checklist_summary = (
        f"Infrastructure: {'OK' if req.infrastructure_ok else 'Deficient'}, "
        f"Labs: {'OK' if req.laboratories_ok else 'Deficient'}, "
        f"Library: {'OK' if req.library_ok else 'Deficient'}, "
        f"Faculty Cadre: {'OK' if req.faculty_cadre_ok else 'Deficient'}"
    )

    audit_entry = AuditEvent(
        id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
        time=get_now_stamp(),
        actor=current_user.full_name,
        target=evc.id,
        event_type="EVC",
        rule="EVC-02",
        detail=(
            f"EVC report submitted: {req.outcome}. Rubric [{checklist_summary}]. "
            f"Remarks: '{req.remarks or 'None'}'. Case state synchronized."
        ),
        correlation=generate_correlation(),
    )

    db.add(audit_entry)
    db.commit()
    db.refresh(evc)
    return evc
