from typing import Optional, List, Literal
from pydantic import BaseModel, ConfigDict

# Routes and Stages constants
ROUTES = {
    'Scrutiny only': ['Initial Scrutiny', 'Decision Pending'],
    'Scrutiny + EVC': ['Initial Scrutiny', 'EVC Scheduling', 'EVC Report Review', 'Decision Pending'],
    'EVC + SAC/SHC': ['EVC Scheduling', 'EVC Report Review', 'SAC/SHC Review', 'Decision Pending'],
    'Only EVC': ['EVC Scheduling', 'EVC Report Review', 'Decision Pending'],
}

# Application Schemas
class ApplicationResponse(BaseModel):
    id: str
    institution: str
    app_type: str
    region: str
    route: str
    stage: str
    status: str
    owner_role: str
    due_date: Optional[str] = None
    age_days: int
    return_reason: Optional[str] = ""
    resume_stage: Optional[str] = ""
    updated_at: str

    model_config = ConfigDict(from_attributes=True)

class ApplicationCreate(BaseModel):
    institution: str
    app_type: str
    region: str
    route: str
    due_date: str

class TransitionRequest(BaseModel):
    action: Literal["complete", "return", "resubmit", "decision"]
    reason: Optional[str] = ""
    decision: Optional[Literal["Approved", "Rejected"]] = None
    remarks: Optional[str] = ""

# Compliance Schemas
class ComplianceResponse(BaseModel):
    id: str
    title: str
    app_id: str
    institution: str
    due_date: Optional[str] = None
    evidence_status: str
    verification: str
    reviewer_role: str
    note: Optional[str] = ""

    model_config = ConfigDict(from_attributes=True)

class EvidenceSubmitRequest(BaseModel):
    note: str

class EvidenceVerifyRequest(BaseModel):
    verified: bool
    remarks: Optional[str] = ""

# EVC Schemas
class EVCTaskResponse(BaseModel):
    id: str
    app_id: str
    institution: str
    visit_date: Optional[str] = ""
    panel: Optional[str] = ""
    report_status: str
    status: str
    coordinator_role: str

    model_config = ConfigDict(from_attributes=True)

class EVCScheduleRequest(BaseModel):
    visit_date: str
    panel: str

class EVCReportRequest(BaseModel):
    outcome: Literal["Satisfactory", "Deficiencies Noted"]
    remarks: Optional[str] = ""

# Document Schemas
class DocumentResponse(BaseModel):
    id: str
    title: str
    institution: str
    expiry_date: str
    renewal_status: str
    review_status: str
    owner_role: str

    model_config = ConfigDict(from_attributes=True)

class DocumentRenewalRequest(BaseModel):
    document_ref: str

class DocumentVerifyRequest(BaseModel):
    verified: bool
    remarks: Optional[str] = ""

# Audit Schemas
class AuditEventResponse(BaseModel):
    id: str
    time: str
    actor: str
    target: str
    event_type: str
    rule: str
    detail: str
    correlation: str

    model_config = ConfigDict(from_attributes=True)
