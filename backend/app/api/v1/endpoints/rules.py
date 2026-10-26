import random
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user, require_roles
from app.models.user import User
from app.models.rule_config import RuleConfig
from app.models.audit import AuditEvent
from app.schemas.rules import (
    AutomationRuleResponse,
    RuleConfigResponse,
    RuleConfigUpdate,
    RuleEvaluationRequest,
    RuleEvaluationResponse,
)
from app.services.rules_engine import (
    AUTOMATION_RULES_CATALOG,
    get_or_create_rule_config,
    evaluate_rules,
)

router = APIRouter()

def get_now_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")

def generate_correlation() -> str:
    return "COR-" + uuid.uuid4().hex[:7].upper()

@router.get("/", response_model=List[AutomationRuleResponse])
def get_rule_catalog(
    current_user: User = Depends(get_current_user),
):
    """Retrieve catalog of all AICTE statutory automation rules."""
    return [AutomationRuleResponse(**r) for r in AUTOMATION_RULES_CATALOG]

@router.get("/config", response_model=RuleConfigResponse)
def get_rule_config(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve active automation thresholds and simulation configuration."""
    return get_or_create_rule_config(db)

@router.put("/config", response_model=RuleConfigResponse)
def update_rule_config(
    req: RuleConfigUpdate,
    current_user: User = Depends(require_roles("System Operator", "Regional Officer", "Scrutiny Officer")),
    db: Session = Depends(get_db),
):
    """Update automation rule thresholds or simulation clock."""
    config = get_or_create_rule_config(db)

    changes = []
    if req.reminder_days is not None:
        changes.append(f"reminder_days: {config.reminder_days} -> {req.reminder_days}")
        config.reminder_days = req.reminder_days
    if req.expiry_days is not None:
        changes.append(f"expiry_days: {config.expiry_days} -> {req.expiry_days}")
        config.expiry_days = req.expiry_days
    if req.escalation_role is not None:
        changes.append(f"escalation_role: {config.escalation_role} -> {req.escalation_role}")
        config.escalation_role = req.escalation_role
    if req.policy_version is not None:
        changes.append(f"policy_version: {config.policy_version} -> {req.policy_version}")
        config.policy_version = req.policy_version
    if req.simulation_date is not None:
        changes.append(f"simulation_date: {config.simulation_date} -> {req.simulation_date}")
        config.simulation_date = req.simulation_date

    if changes:
        audit = AuditEvent(
            id=f"AUD-{random.randint(1000, 9999)}",
            time=get_now_stamp(),
            actor=current_user.full_name,
            target="RuleConfig",
            event_type="Automation",
            rule="CONFIG-UPDATE",
            detail=f"Automation settings updated: {'; '.join(changes)}",
            correlation=generate_correlation(),
        )
        db.add(audit)
        db.commit()
        db.refresh(config)

    return config

@router.post("/evaluate", response_model=RuleEvaluationResponse)
def run_evaluation_cycle(
    req: Optional[RuleEvaluationRequest] = None,
    as_of_date: Optional[str] = Query(None, description="Simulation reference date in YYYY-MM-DD format"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Execute an idempotent rule evaluation scan across cases, compliance, and documents."""
    eval_date = (req.as_of_date if req and req.as_of_date else None) or as_of_date
    return evaluate_rules(db=db, as_of_date_str=eval_date)
