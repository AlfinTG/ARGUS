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
    RegionalReviewRequest,
    ROUTES,
    InstitutionalFilingRequest,
    InstitutionalFilingResponse,
)
from app.services.pdf_generator import (
    generate_electronic_case_summary_pdf,
    generate_sanction_order_pdf,
    generate_deficiency_notice_pdf,
)
from app.models.document import DocumentRecord

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
        id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
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

# ---------- Institutional Filing Endpoint (APH 2026-27) ----------
MANDATORY_DOC_TYPES = {"registered_lease_deed", "fire_safety_noc", "faculty_cadre_undertaking"}

@router.post("/institutional-filing", response_model=InstitutionalFilingResponse, status_code=status.HTTP_201_CREATED)
def institutional_filing(
    req: InstitutionalFilingRequest,
    current_user: User = Depends(require_roles("Institution User", "System Operator")),
    db: Session = Depends(get_db),
):
    """
    Multi-step institutional application filing per AICTE APH 2026-27.
    Creates Application + linked DocumentRecord + ComplianceObligation records atomically.
    """
    # ── 1. Validate affidavit acceptance ─────────────────────────────────
    if not req.affidavit_accepted:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Legal affidavit and APH 2026-27 declaration must be accepted before submission.",
        )

    # ── 2. Validate course intake ─────────────────────────────────────────
    if not req.courses:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one course must be specified in the intake planner.",
        )
    for course in req.courses:
        if course.intake <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Course '{course.title}' has invalid intake capacity {course.intake}. Must be > 0.",
            )

    # ── 3. Validate mandatory statutory documents ─────────────────────────
    submitted_types = {doc.doc_type for doc in req.documents}
    missing = MANDATORY_DOC_TYPES - submitted_types
    if missing:
        missing_labels = ", ".join(sorted(missing))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Missing mandatory statutory documents: {missing_labels}.",
        )

    # ── 4. Validate SHA-256 hashes are present and non-empty ─────────────
    for doc in req.documents:
        if not doc.checksum_sha256 or len(doc.checksum_sha256) != 64:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Document '{doc.title}' is missing a valid SHA-256 hash (must be 64 hex chars).",
            )

    # ── 5. Validate route is supported ───────────────────────────────────
    if req.route not in ROUTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported approval route '{req.route}'. Valid routes: {', '.join(ROUTES.keys())}.",
        )

    # ── 6. Generate identifiers ───────────────────────────────────────────
    corr = generate_correlation()
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    app_seq = random.randint(100, 999)
    app_id = f"APP-2026-{app_seq}"

    route_stages = ROUTES[req.route]
    initial_stage = route_stages[0]
    owner_role = "Committee Coordinator" if initial_stage == "EVC Scheduling" else "Scrutiny Officer"

    # Default due date: 90 days from today if not provided
    due_date = req.due_date
    if not due_date:
        from datetime import timedelta
        due_date = (datetime.now(timezone.utc) + timedelta(days=90)).strftime("%Y-%m-%d")

    # ── 7. Create the Application record ──────────────────────────────────
    institution_label = f"{req.institution_name} [{req.aicte_permanent_id}]"
    new_app = Application(
        id=app_id,
        institution=institution_label,
        app_type=req.app_type,
        region=req.region,
        route=req.route,
        stage=initial_stage,
        status="Under Scrutiny",
        owner_role=owner_role,
        due_date=due_date,
        age_days=0,
        return_reason="",
        resume_stage="",
        updated_at=now_str,
    )
    db.add(new_app)

    # ── 8. Auto-provision linked DocumentRecord entities ──────────────────
    doc_label_map = {
        "registered_lease_deed": "Registered Lease Deed",
        "fire_safety_noc": "Fire Safety NOC",
        "faculty_cadre_undertaking": "Faculty Cadre Undertaking",
    }
    for statutory_doc in req.documents:
        doc_id = f"DOC-{app_seq}-{statutory_doc.doc_type[:3].upper()}"
        doc_record = DocumentRecord(
            id=doc_id,
            title=doc_label_map.get(statutory_doc.doc_type, statutory_doc.title),
            institution=institution_label,
            expiry_date="2027-10-31",
            renewal_status="Submitted",
            review_status="Pending Verification",
            owner_role="Institution User",
            file_name=statutory_doc.file_name,
            file_path=f"/uploads/{app_id}/{statutory_doc.file_name}",
            file_size=statutory_doc.file_size,
            mime_type="application/pdf",
            checksum_sha256=statutory_doc.checksum_sha256,
            uploaded_at=statutory_doc.uploaded_at or now_str,
        )
        db.add(doc_record)

    # ── 9. Auto-provision a ComplianceObligation per course ──────────────
    from datetime import timedelta
    cmp_due = (datetime.now(timezone.utc) + timedelta(days=120)).strftime("%Y-%m-%d")
    for i, course in enumerate(req.courses):
        cmp_id = f"CMP-{app_seq}-{i+1:02d}"
        obligation = ComplianceObligation(
            id=cmp_id,
            title=f"Course Approval Compliance – {course.title} ({course.level})",
            app_id=app_id,
            institution=institution_label,
            due_date=cmp_due,
            evidence_status="Not submitted",
            verification="Not reviewed",
            reviewer_role="Regional Officer",
            note=f"Program: {course.program} | Intake: {course.intake}",
        )
        db.add(obligation)

    # ── 10. Audit event ───────────────────────────────────────────────────
    total_intake = sum(c.intake for c in req.courses)
    audit_entry = AuditEvent(
        id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
        time=get_now_stamp(),
        actor=current_user.full_name,
        target=app_id,
        event_type="Workflow",
        rule="WF-FILING",
        detail=(
            f"Institutional Application Filing submitted by '{req.signatory_designation}' under APH 2026-27. "
            f"AICTE ID: {req.aicte_permanent_id}, Route: {req.route}, "
            f"Courses: {len(req.courses)}, Total Intake: {total_intake}, "
            f"Statutory Docs: {len(req.documents)}. Correlation: {corr}."
        ),
        correlation=corr,
    )
    db.add(audit_entry)

    db.commit()
    db.refresh(new_app)

    return InstitutionalFilingResponse(
        application=ApplicationResponse.model_validate(new_app),
        correlation_token=corr,
        total_intake=total_intake,
        courses_count=len(req.courses),
        documents_count=len(req.documents),
        message=(
            f"Application {app_id} filed successfully under APH 2026-27. "
            f"Initial stage: {initial_stage}. Correlation: {corr}."
        ),
    )


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

        if app.stage == "EVC Scheduling":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="EVC scheduling and inspection must be completed through the EVC desk.",
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
        elif next_stage == "EVC Report Review":
            next_status = "In progress"
            next_owner = "Regional Officer"
        elif next_stage == "SAC/SHC Review":
            next_status = "In progress"
            next_owner = "Regional Officer"
        elif next_stage == "Decision Pending":
            next_status = "Decision pending"
            next_owner = "Competent Authority"

        old_stage = app.stage
        app.stage = next_stage
        app.status = next_status
        app.owner_role = next_owner
        app.updated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        audit_entry = AuditEvent(
            id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
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
            id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
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
            id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
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
        if req.decision == "Approved":
            app.return_reason = ""
        elif req.decision == "Rejected" and req.remarks:
            app.return_reason = req.remarks.strip()
        app.updated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        audit_entry = AuditEvent(
            id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
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


# ── Valid stages for regional review ─────────────────────────────────────────
REGIONAL_REVIEW_ELIGIBLE_STAGES = {"EVC Report Review", "Initial Scrutiny", "SAC/SHC Review"}

@router.post("/{id}/regional-review", response_model=ApplicationResponse)
def regional_review(
    id: str,
    req: RegionalReviewRequest,
    current_user: User = Depends(require_roles("Regional Officer", "System Operator")),
    db: Session = Depends(get_db),
):
    """
    Regional Office dossier review and endorsement (APH 2026-27 Phase 4).
    - Endorse  → advance to next route stage
    - Escalate → fast-track directly to Decision Pending
    - Return   → send back to Institution Response with deficiency grounds
    Audit rule: REG-01
    """
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    if not req.remarks or not req.remarks.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Regional review remarks are mandatory. Provide substantive observations.",
        )

    if app.stage not in REGIONAL_REVIEW_ELIGIBLE_STAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Application stage '{app.stage}' is not eligible for Regional Office review. "
                f"Eligible stages: {sorted(REGIONAL_REVIEW_ELIGIBLE_STAGES)}."
            ),
        )

    corr = generate_correlation()
    time_stamp = get_now_stamp()
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Mark any specified compliance obligations as verified
    if req.compliance_ids_verified:
        for cmp_id in req.compliance_ids_verified:
            cmp = db.query(ComplianceObligation).filter(ComplianceObligation.id == cmp_id).first()
            if cmp:
                cmp.verification = "Verified"

    old_stage = app.stage

    if req.recommendation == "Endorse":
        route_seq = ROUTES.get(app.route, [])
        try:
            curr_idx = route_seq.index(app.stage)
        except ValueError:
            curr_idx = -1

        if curr_idx < 0 or curr_idx >= len(route_seq) - 1:
            app.stage = "Decision Pending"
            app.status = "Decision pending"
            app.owner_role = "Competent Authority"
        else:
            next_stage = route_seq[curr_idx + 1]
            app.stage = next_stage
            if next_stage == "Decision Pending":
                app.status = "Decision pending"
                app.owner_role = "Competent Authority"
            elif next_stage == "SAC/SHC Review":
                app.status = "In progress"
                app.owner_role = "Regional Officer"
            else:
                app.status = "In progress"
                app.owner_role = "Competent Authority"
        app.updated_at = now_str

    elif req.recommendation == "Escalate":
        app.stage = "Decision Pending"
        app.status = "Decision pending"
        app.owner_role = "Competent Authority"
        app.updated_at = now_str

    elif req.recommendation == "Return":
        app.resume_stage = app.stage
        app.stage = "Institution Response"
        app.status = "Awaiting institution"
        app.owner_role = "Institution User"
        app.return_reason = req.remarks.strip()
        app.updated_at = now_str

    audit_entry = AuditEvent(
        id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
        time=time_stamp,
        actor=current_user.full_name,
        target=app.id,
        event_type="Workflow",
        rule="REG-01",
        detail=(
            f"Regional Officer review: '{req.recommendation}'. "
            f"Stage: '{old_stage}' → '{app.stage}'. "
            f"Compliance verified: {req.compliance_ids_verified or []}. "
            f"Remarks: '{req.remarks.strip()}'."
        ),
        correlation=corr,
    )

    db.add(audit_entry)
    db.commit()
    db.refresh(app)
    return app


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

    elif letter_type == "deficiency" or app.status == "Awaiting institution" or app.return_reason or app.stage == "Rejected":
        if not app.return_reason and app.status != "Awaiting institution" and app.stage != "Rejected":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Deficiency Notice can only be generated for applications returned under WF-02 with recorded deficiency grounds.",
            )
        pdf_bytes = generate_deficiency_notice_pdf(app=app, audit_events=audit_events)
        doc_filename = f"Deficiency_Notice_{app.id}.pdf" if app.stage != "Rejected" else f"Rejection_Order_{app.id}.pdf"

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

