import random
import uuid
from datetime import datetime, date, timezone
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.compliance import ComplianceObligation
from app.models.document import DocumentRecord
from app.models.alert import Alert
from app.models.audit import AuditEvent
from app.models.rule_config import RuleConfig
from app.schemas.rules import RuleEvaluationResponse

AUTOMATION_RULES_CATALOG = [
    {
        "id": "WF-01",
        "name": "Route after stage completion",
        "trigger": "Authorized stage-completed event",
        "action": "Move to next configured stage when preconditions pass.",
    },
    {
        "id": "WF-02",
        "name": "Deficiency return and resubmission",
        "trigger": "Authorized return with reason / institution response",
        "action": "Preserve resume stage, request evidence and route response back for review.",
    },
    {
        "id": "DL-01",
        "name": "Upcoming deadline reminder",
        "trigger": "Unresolved item falls inside the configured reminder window",
        "action": "Create one reminder for the item, rule version and threshold window.",
    },
    {
        "id": "DL-02",
        "name": "Overdue escalation",
        "trigger": "Unresolved item due date precedes simulation date",
        "action": "Create escalation to the configured recipient role.",
    },
    {
        "id": "EVC-01",
        "name": "EVC scheduling queue",
        "trigger": "EVC-required case reaches EVC Scheduling",
        "action": "Ensure one active scheduling task/queue entry exists.",
    },
    {
        "id": "EVC-02",
        "name": "EVC report follow-up",
        "trigger": "Visit completed and report still outstanding",
        "action": "Create a report follow-up task for committee coordinator.",
    },
    {
        "id": "CMP-01",
        "name": "Evidence review task",
        "trigger": "Institution submits compliance evidence",
        "action": "Set Pending Verification and assign the configured reviewer.",
    },
    {
        "id": "DOC-01",
        "name": "Document expiry watch",
        "trigger": "Document within warning window or past validity date",
        "action": "Flag warning or mark expired with escalation.",
    },
]

def get_now_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")

def generate_correlation() -> str:
    return "COR-" + uuid.uuid4().hex[:7].upper()

def generate_alert_id() -> str:
    return f"ALT-{uuid.uuid4().hex[:8].upper()}"

def generate_audit_id() -> str:
    return f"AUD-{uuid.uuid4().hex[:8].upper()}"

def parse_iso_date(date_str: Optional[str]) -> Optional[date]:
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str.strip()[:10], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None

def compute_day_diff(target_date_str: Optional[str], as_of: date) -> Optional[int]:
    target = parse_iso_date(target_date_str)
    if not target:
        return None
    return (target - as_of).days

def get_or_create_rule_config(db: Session) -> RuleConfig:
    cfg = db.query(RuleConfig).filter(RuleConfig.id == "default").first()
    if not cfg:
        cfg = RuleConfig(
            id="default",
            reminder_days=7,
            expiry_days=30,
            escalation_role="Regional Officer",
            policy_version="DEMO-v1",
            simulation_date="2026-10-26",
        )
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg

def evaluate_rules(db: Session, as_of_date_str: Optional[str] = None) -> RuleEvaluationResponse:
    config = get_or_create_rule_config(db)

    # Determine reference date
    eval_date: date
    if as_of_date_str:
        parsed = parse_iso_date(as_of_date_str)
        eval_date = parsed if parsed else datetime.now(timezone.utc).date()
    else:
        cfg_date = parse_iso_date(config.simulation_date)
        eval_date = cfg_date if cfg_date else datetime.now(timezone.utc).date()

    now_stamp = get_now_stamp()
    corr = generate_correlation()

    # Pre-fetch existing processed keys for deduplication
    existing_keys_query = db.query(Alert.processed_key).filter(Alert.processed_key.isnot(None)).all()
    processed_keys = set(k[0] for k in existing_keys_query)

    new_alerts: List[Alert] = []
    new_audits: List[AuditEvent] = []
    skipped_duplicates = 0

    # 1. Evaluate Applications
    apps = db.query(Application).all()
    eval_apps_count = 0

    for app in apps:
        if app.status in ["Closed", "Rejected", "Approved"]:
            continue
        diff = compute_day_diff(app.due_date, eval_date)
        if diff is None:
            continue
        eval_apps_count += 1

        # Overdue Rule DL-02
        if diff < 0:
            key = f"{app.id}:DL-02:{app.due_date}:{config.policy_version}"
            if key in processed_keys:
                skipped_duplicates += 1
            else:
                processed_keys.add(key)
                alert_id = generate_alert_id()
                new_alerts.append(
                    Alert(
                        id=alert_id,
                        title=f"Application Overdue: {app.id}",
                        target=app.id,
                        rule_id="DL-02",
                        message=f"Application is {abs(diff)} days past statutory scrutiny deadline ({app.due_date}). Escalated to {config.escalation_role}.",
                        recipient_role=config.escalation_role,
                        created_at=now_stamp,
                        status="Open",
                        processed_key=key,
                    )
                )
                new_audits.append(
                    AuditEvent(
                        id=generate_audit_id(),
                        time=now_stamp,
                        actor="Automation Engine",
                        target=app.id,
                        event_type="Automation",
                        rule="DL-02",
                        detail=f"Rule DL-02 triggered: Overdue escalation alert generated for {app.id}.",
                        correlation=corr,
                    )
                )
        # Upcoming Deadline Rule DL-01
        elif diff <= config.reminder_days:
            key = f"{app.id}:DL-01:{app.due_date}:{config.policy_version}"
            if key in processed_keys:
                skipped_duplicates += 1
            else:
                processed_keys.add(key)
                alert_id = generate_alert_id()
                new_alerts.append(
                    Alert(
                        id=alert_id,
                        title=f"Deadline Approaching: {app.id}",
                        target=app.id,
                        rule_id="DL-01",
                        message=f"Stage '{app.stage}' due in {diff} day(s) on {app.due_date}.",
                        recipient_role=app.owner_role,
                        created_at=now_stamp,
                        status="Open",
                        processed_key=key,
                    )
                )
                new_audits.append(
                    AuditEvent(
                        id=generate_audit_id(),
                        time=now_stamp,
                        actor="Automation Engine",
                        target=app.id,
                        event_type="Automation",
                        rule="DL-01",
                        detail=f"Rule DL-01 triggered: Reminder generated for {app.id} ({diff}d remaining).",
                        correlation=corr,
                    )
                )

    # 2. Evaluate Compliance Obligations
    compliance_items = db.query(ComplianceObligation).all()
    eval_compliance_count = 0

    for comp in compliance_items:
        if comp.verification == "Verified":
            continue
        diff = compute_day_diff(comp.due_date, eval_date)
        if diff is None:
            continue
        eval_compliance_count += 1

        if diff < 0:
            key = f"{comp.id}:DL-02:{comp.due_date}:{config.policy_version}"
            if key in processed_keys:
                skipped_duplicates += 1
            else:
                processed_keys.add(key)
                alert_id = generate_alert_id()
                new_alerts.append(
                    Alert(
                        id=alert_id,
                        title=f"Overdue Obligation: {comp.title}",
                        target=comp.id,
                        rule_id="DL-02",
                        message=f"Institutional undertaking '{comp.title}' is {abs(diff)} days overdue.",
                        recipient_role=config.escalation_role,
                        created_at=now_stamp,
                        status="Open",
                        processed_key=key,
                    )
                )
        elif diff <= config.reminder_days:
            key = f"{comp.id}:DL-01:{comp.due_date}:{config.policy_version}"
            if key in processed_keys:
                skipped_duplicates += 1
            else:
                processed_keys.add(key)
                alert_id = generate_alert_id()
                new_alerts.append(
                    Alert(
                        id=alert_id,
                        title=f"Obligation Due Soon: {comp.title}",
                        target=comp.id,
                        rule_id="DL-01",
                        message=f"Undertaking '{comp.title}' is due in {diff} day(s).",
                        recipient_role="Institution User",
                        created_at=now_stamp,
                        status="Open",
                        processed_key=key,
                    )
                )

    # 3. Evaluate Statutory Documents
    documents = db.query(DocumentRecord).all()
    eval_documents_count = 0

    for doc in documents:
        if doc.review_status == "Verified":
            continue
        diff = compute_day_diff(doc.expiry_date, eval_date)
        if diff is None:
            continue
        eval_documents_count += 1

        if diff < 0:
            key = f"{doc.id}:DOC-01:EXPIRED:{doc.expiry_date}:{config.policy_version}"
            if key in processed_keys:
                skipped_duplicates += 1
            else:
                processed_keys.add(key)
                alert_id = generate_alert_id()
                new_alerts.append(
                    Alert(
                        id=alert_id,
                        title=f"Document Expired: {doc.title}",
                        target=doc.id,
                        rule_id="DOC-01",
                        message=f"Mandatory institutional certificate '{doc.title}' expired on {doc.expiry_date}. Renewal required immediately.",
                        recipient_role=config.escalation_role,
                        created_at=now_stamp,
                        status="Open",
                        processed_key=key,
                    )
                )
        elif diff <= config.expiry_days:
            key = f"{doc.id}:DOC-01:WARNING:{doc.expiry_date}:{config.policy_version}"
            if key in processed_keys:
                skipped_duplicates += 1
            else:
                processed_keys.add(key)
                alert_id = generate_alert_id()
                new_alerts.append(
                    Alert(
                        id=alert_id,
                        title=f"Document Expiry Warning: {doc.title}",
                        target=doc.id,
                        rule_id="DOC-01",
                        message=f"Institutional certificate expires in {diff} days ({doc.expiry_date}). Initiate renewal review.",
                        recipient_role="Institution User",
                        created_at=now_stamp,
                        status="Open",
                        processed_key=key,
                    )
                )

    # 4. Summary Audit Event
    summary_audit = AuditEvent(
        id=generate_audit_id(),
        time=now_stamp,
        actor="Automation Engine",
        target="System",
        event_type="Automation",
        rule="CYCLE-SCAN",
        detail=f"Rule evaluation cycle executed as of {eval_date}. Scanned: {eval_apps_count} cases, {eval_compliance_count} obligations, {eval_documents_count} docs. New alerts: {len(new_alerts)}, Skipped duplicates: {skipped_duplicates}.",
        correlation=corr,
    )
    new_audits.append(summary_audit)

    # 5. Atomic transaction persist
    if new_alerts:
        db.add_all(new_alerts)
    if new_audits:
        db.add_all(new_audits)
    db.commit()

    msg = (
        f"Automation cycle completed: {len(new_alerts)} new actionable alert(s) generated."
        if len(new_alerts) > 0
        else "Cycle completed: No new alerts needed (all records up-to-date or already processed)."
    )

    return RuleEvaluationResponse(
        evaluated_applications=eval_apps_count,
        evaluated_compliance=eval_compliance_count,
        evaluated_documents=eval_documents_count,
        alerts_spawned=len(new_alerts),
        skipped_duplicates=skipped_duplicates,
        message=msg,
    )
