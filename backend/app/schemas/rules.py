from typing import List, Optional
from pydantic import BaseModel, Field

class AutomationRuleResponse(BaseModel):
    id: str
    name: str
    trigger: str
    action: str

class RuleConfigResponse(BaseModel):
    id: str
    reminder_days: int
    expiry_days: int
    escalation_role: str
    policy_version: str
    simulation_date: str

    class Config:
        from_attributes = True

class RuleConfigUpdate(BaseModel):
    reminder_days: Optional[int] = Field(None, ge=1, le=60)
    expiry_days: Optional[int] = Field(None, ge=1, le=180)
    escalation_role: Optional[str] = None
    policy_version: Optional[str] = None
    simulation_date: Optional[str] = None

class RuleEvaluationRequest(BaseModel):
    as_of_date: Optional[str] = None

class RuleEvaluationResponse(BaseModel):
    evaluated_applications: int
    evaluated_compliance: int
    evaluated_documents: int
    alerts_spawned: int
    skipped_duplicates: int
    message: str

class AlertResponse(BaseModel):
    id: str
    title: str
    target: str
    rule_id: str
    message: str
    recipient_role: str
    created_at: str
    status: str
    processed_key: Optional[str] = None

    class Config:
        from_attributes = True

class AlertActionRequest(BaseModel):
    note: Optional[str] = None

class CommunicationDispatchResponse(BaseModel):
    id: str
    channel: str  # "SMS" | "EMAIL"
    recipient: str
    recipient_role: str
    target: str
    rule_id: str
    subject: str
    message: str
    dispatched_at: str
    status: str
    correlation: str
