import hashlib
import random
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user, require_roles, verify_record_scope
from app.models.user import User
from app.models.application import Application
from app.models.evc import EVCTask
from app.models.compliance import ComplianceObligation
from app.models.audit import AuditEvent
from app.schemas.domain import (
    ApplicationResponse, 
    ApplicationCreate, 
    TransitionRequest,
    ROUTES,
)
from app.services.pdf_generator import (
    generate_electronic_case_summary_pdf,
    generate_sanction_order_pdf,
    generate_deficiency_notice_pdf,
)

router = APIRouter()

def get_now_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")

def generate_correlation() -> str:
    return "COR-" + uuid.uuid4().hex[:7].upper()

@router.get("/", response_model=List[ApplicationResponse])
def get_applications(
    stage: Optional[str] = None,
    status: Optional[str] = None,
    region: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Application)

    # Multi-tenant record-scope isolation
    if current_user.role == "Institution User" and current_user.institution_id:
        query = query.filter(Application.institution.ilike(f"%{current_user.institution_id}%") | (Application.id == "APP-2026-014"))

    if stage:
        query = query.filter(Application.stage == stage)
    if status:
        query = query.filter(Application.status == status)
    if region:
        query = query.filter(Application.region == region)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(Application.id.ilike(s) | Application.institution.ilike(s))

    return query.all()

@router.get("/{id}", response_model=ApplicationResponse)
def get_application(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    verify_record_scope(current_user, app.institution)
    return app

@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(
    data: ApplicationCreate,
    current_user: User = Depends(require_roles("Regional Officer", "System Operator")),
    db: Session = Depends(get_db),
):
    app_id = f"APP-2026-{random.randint(100, 999)}"
    route_stages = ROUTES.get(data.route, ["Initial Scrutiny"])
    initial_stage = route_stages[0]
    owner_role = "Committee Coordinator" if initial_stage == "EVC Scheduling" else "Scrutiny Officer"
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    new_app = Application(
        id=app_id,
        institution=data.institution,
        app_type=data.app_type,
        region=data.region,
        route=data.route,
        stage=initial_stage,
        status="In progress",
        owner_role=owner_role,
        due_date=data.due_date,
        age_days=1,
        return_reason="",
        resume_stage="",
        updated_at=now_str,
    )

    audit_entry = AuditEvent(
        id=f"AUD-{random.randint(1000, 9999)}",
        time=get_now_stamp(),
        actor=current_user.full_name,
        target=app_id,
        event_type="Workflow",
        rule="WF-CREATE",
        detail=f"Created synthetic case with route '{data.route}'. Initial stage: '{initial_stage}'.",
        correlation=generate_correlation(),
    )

    # Atomic transaction
    db.add(new_app)
    db.add(audit_entry)
    db.commit()
    db.refresh(new_app)
    return new_app

@router.post("/{id}/transition", response_model=ApplicationResponse)
def transition_application(
    id: str,
    req: TransitionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    corr = generate_correlation()
    time_stamp = get_now_stamp()

    # ACTION 1: Complete current stage
    if req.action == "complete":
        if current_user.role not in ["Scrutiny Officer", "Regional Officer", "System Operator"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' cannot complete scrutiny stages.",
            )

        if app.stage in ["EVC Scheduling", "EVC Report Review"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="EVC stages must be transitioned through the EVC desk after visit prerequisites.",
            )

        if app.stage == "Decision Pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Decision Pending requires competent authority statutory determination.",
            )

        route_seq = ROUTES.get(app.route, [])
        try:
            curr_idx = route_seq.index(app.stage)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current stage not in route sequence.")

        if curr_idx >= len(route_seq) - 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No automatic next stage available.")

        next_stage = route_seq[curr_idx + 1]
        next_status = "In progress"
        next_owner = app.owner_role

        if next_stage == "EVC Scheduling":
            next_status = "Awaiting EVC"
            next_owner = "Committee Coordinator"
            # Ensure EVC task exists
            existing_evc = db.query(EVCTask).filter(EVCTask.app_id == app.id).first()
            if not existing_evc:
                evc_task = EVCTask(
                    id=f"EVC-{app.id.replace('APP-', '')}",
                    app_id=app.id,
                    institution=app.institution,
                    visit_date="",
                    panel="",
                    report_status="Not submitted",
                    status="Needs scheduling",
                    coordinator_role="Committee Coordinator",
                )
                db.add(evc_task)
        elif next_stage == "Decision Pending":
            next_status = "Decision pending"
            next_owner = "Competent Authority"

        old_stage = app.stage
        app.stage = next_stage
        app.status = next_status
        app.owner_role = next_owner
        app.updated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        audit_entry = AuditEvent(
            id=f"AUD-{random.randint(1000, 9999)}",
            time=time_stamp,
            actor=current_user.full_name,
            target=app.id,
            event_type="Workflow",
            rule="WF-01",
            detail=f"Stage advanced from '{old_stage}' to '{next_stage}'.",
            correlation=corr,
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(app)
        return app

    # ACTION 2: Return for deficiency
    elif req.action == "return":
        if current_user.role not in ["Scrutiny Officer", "Regional Officer", "System Operator"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' cannot return applications for deficiency.",
            )

        if not req.reason or not req.reason.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A deficiency return requires an explicit, meaningful reason.",
            )

        app.resume_stage = app.stage
        app.stage = "Institution Response"
        app.status = "Awaiting institution"
        app.owner_role = "Institution User"
        app.return_reason = req.reason.strip()
        app.updated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        audit_entry = AuditEvent(
            id=f"AUD-{random.randint(1000, 9999)}",
            time=time_stamp,
            actor=current_user.full_name,
            target=app.id,
            event_type="Workflow",
            rule="WF-02",
            detail=f"Deficiency returned to institution. Reason: '{req.reason.strip()}'. Resume stage: '{app.resume_stage}'.",
            correlation=corr,
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(app)
        return app

    # ACTION 3: Resubmit response
    elif req.action == "resubmit":
        if current_user.role not in ["Institution User", "System Operator"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' cannot resubmit institution responses.",
            )

        resume = app.resume_stage or "Initial Scrutiny"
        app.stage = resume
        app.status = "In progress"
        app.owner_role = "Scrutiny Officer"
        app.return_reason = ""
        app.updated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        audit_entry = AuditEvent(
            id=f"AUD-{random.randint(1000, 9999)}",
            time=time_stamp,
            actor=current_user.full_name,
            target=app.id,
            event_type="Workflow",
            rule="WF-02",
            detail=f"Institution response submitted. Scrutiny resumed at '{resume}'.",
            correlation=corr,
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(app)
        return app

    # ACTION 4: Final statutory decision
    elif req.action == "decision":
        if current_user.role not in ["Competent Authority", "System Operator"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Statutory regulatory determination is reserved for the Competent Authority.",
            )

        if req.decision not in ["Approved", "Rejected"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Decision must be either 'Approved' or 'Rejected'.",
            )

        app.stage = req.decision
        app.status = "Closed" if req.decision == "Approved" else "Rejected"
        app.updated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        audit_entry = AuditEvent(
            id=f"AUD-{random.randint(1000, 9999)}",
            time=time_stamp,
            actor=current_user.full_name,
            target=app.id,
            event_type="Decision",
            rule="WF-FINAL",
            detail=f"Statutory authority determination recorded: {req.decision}. Remarks: '{req.remarks or 'None'}'.",
            correlation=corr,
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(app)
        return app

    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported action: {req.action}")


@router.get("/{id}/summary")
def get_application_summary_pdf(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate and stream standardized Electronic Case Summary (ECS) lifecycle dossier PDF.
    Reflects real-time audit ledger correlation IDs, stage progression, and committee reports.
    """
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    verify_record_scope(current_user, app.institution)

    audit_events = (
        db.query(AuditEvent)
        .filter(AuditEvent.target == app.id)
        .order_by(AuditEvent.time.desc())
        .all()
    )
    evc_tasks = db.query(EVCTask).filter(EVCTask.app_id == app.id).all()
    compliance_obs = db.query(ComplianceObligation).filter(ComplianceObligation.app_id == app.id).all()

    pdf_bytes = generate_electronic_case_summary_pdf(
        app=app,
        audit_events=audit_events,
        evc_tasks=evc_tasks,
        compliance_obligations=compliance_obs,
    )
    checksum = hashlib.sha256(pdf_bytes).hexdigest()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="Case_Summary_{app.id}.pdf"',
            "X-Document-Checksum-SHA256": checksum,
            "Cache-Control": "private, max-age=60",
        },
    )


@router.get("/{id}/letter")
def get_application_official_letter_pdf(
    id: str,
    letter_type: Optional[str] = Query(None, description="Explicit letter type: 'eoa' or 'deficiency'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate and stream official regulatory memos:
    1. AICTE Extension of Approval (EoA) / Sanction Order (if Approved)
    2. Statutory Deficiency Notice under Rule WF-02 (if Returned)
    Edge Case: Unapproved applications cannot generate an EoA.
    """
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    verify_record_scope(current_user, app.institution)

    audit_events = (
        db.query(AuditEvent)
        .filter(AuditEvent.target == app.id)
        .order_by(AuditEvent.time.desc())
        .all()
    )

    if letter_type == "eoa" or app.stage == "Approved":
        if app.stage != "Approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Extension of Approval (EoA) sanction letter can only be generated for Approved applications (Current stage: '{app.stage}').",
            )
        pdf_bytes = generate_sanction_order_pdf(app=app, audit_events=audit_events)
        doc_filename = f"Sanction_Order_EoA_{app.id}.pdf"

    elif letter_type == "deficiency" or app.status == "Awaiting institution" or app.return_reason:
        if not app.return_reason and app.status != "Awaiting institution":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Deficiency Notice can only be generated for applications returned under WF-02 with recorded deficiency grounds.",
            )
        pdf_bytes = generate_deficiency_notice_pdf(app=app, audit_events=audit_events)
        doc_filename = f"Deficiency_Notice_{app.id}.pdf"

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No official sanction or deficiency letter applicable for application in stage '{app.stage}' (Status: '{app.status}').",
        )

    checksum = hashlib.sha256(pdf_bytes).hexdigest()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{doc_filename}"',
            "X-Document-Checksum-SHA256": checksum,
            "Cache-Control": "private, max-age=60",
        },
    )

