import type { RoleType } from './index';

export type RouteType = 
  | 'Scrutiny only' 
  | 'Scrutiny + EVC' 
  | 'EVC + SAC/SHC' 
  | 'Only EVC';

export type ApplicationStage = 
  | 'Initial Scrutiny'
  | 'Institution Response'
  | 'EVC Scheduling'
  | 'EVC Report Review'
  | 'SAC/SHC Review'
  | 'Decision Pending'
  | 'Approved'
  | 'Rejected';

export type ApplicationStatus = 
  | 'In progress'
  | 'Action required'
  | 'Awaiting institution'
  | 'Awaiting EVC'
  | 'Decision pending'
  | 'Closed'
  | 'Rejected';

export interface Application {
  id: string;
  institution: string;
  type: string;
  region: string;
  route: RouteType;
  stage: ApplicationStage;
  status: ApplicationStatus;
  ownerRole: RoleType;
  dueDate: string;
  ageDays: number;
  returnReason: string;
  resumeStage: string;
  updatedAt: string;
}

export type EvidenceStatus = 'Not submitted' | 'Submitted';
export type VerificationStatus = 'Not reviewed' | 'Pending Verification' | 'Verified' | 'Rejected / clarification';

export interface ComplianceObligation {
  id: string;
  title: string;
  appId: string;
  institution: string;
  dueDate: string;
  evidenceStatus: EvidenceStatus;
  verification: VerificationStatus;
  reviewerRole: RoleType;
  note: string;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  checksumSha256?: string;
  uploadedAt?: string;
}

export type EVCReportStatus = 'Not submitted' | 'Submitted' | 'Reviewed';
export type EVCTaskStatus = 'Needs scheduling' | 'Scheduled' | 'Completed';

export interface EVCTask {
  id: string;
  appId: string;
  institution: string;
  visitDate: string;
  panel: string;
  reportStatus: EVCReportStatus;
  status: EVCTaskStatus;
  coordinatorRole: RoleType;
}

export type DocumentRenewalStatus = 'Not submitted' | 'Submitted' | 'Verified';
export type DocumentReviewStatus = 'Not reviewed' | 'Pending Verification' | 'Verified';

export interface FileUploadResult {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  checksumSha256: string;
  previewUrl: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  institution: string;
  expiryDate: string;
  renewalStatus: DocumentRenewalStatus;
  reviewStatus: DocumentReviewStatus;
  ownerRole: RoleType;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  checksumSha256?: string;
  uploadedAt?: string;
}

export type AlertState = 'Open' | 'Acknowledged' | 'Resolved';

export interface Alert {
  id: string;
  title: string;
  target: string;
  ruleId: string;
  message: string;
  recipientRole: RoleType;
  createdAt: string;
  status: AlertState;
  processedKey?: string;
}

export interface CommunicationDispatch {
  id: string;
  channel: 'SMS' | 'EMAIL';
  recipient: string;
  recipientRole: string;
  target: string;
  ruleId: string;
  subject: string;
  message: string;
  dispatchedAt: string;
  status: string;
  correlation: string;
}

export type AuditEventType = 
  | 'Workflow' 
  | 'Automation' 
  | 'Compliance' 
  | 'Document' 
  | 'EVC' 
  | 'Alert' 
  | 'Decision' 
  | 'System';

export interface AuditEvent {
  id: string;
  time: string;
  actor: string;
  target: string;
  type: AuditEventType;
  rule: string;
  detail: string;
  correlation: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
}

export interface DemoSettings {
  reminderDays: number;
  expiryDays: number;
  escalationRole: RoleType;
  policyVersion: string;
}

export interface AppState {
  role: RoleType;
  simDate: string;
  settings: DemoSettings;
  apps: Application[];
  compliance: ComplianceObligation[];
  evcs: EVCTask[];
  docs: DocumentRecord[];
  alerts: Alert[];
  audit: AuditEvent[];
  processedKeys: string[];
  selectedAppId: string | null;
}

// ── Institutional Application Filing (APH 2026-27) ───────────────────────────
export interface CourseIntakeItem {
  program: string;
  level: 'UG' | 'PG' | 'Diploma';
  title: string;
  intake: number;
}

export interface StatutoryDocumentPayload {
  doc_type: 'registered_lease_deed' | 'fire_safety_noc' | 'faculty_cadre_undertaking';
  title: string;
  file_name: string;
  checksum_sha256: string;
  file_size?: number;
  uploaded_at?: string;
}

export interface InstitutionalFilingPayload {
  aicte_permanent_id: string;
  institution_name: string;
  region: string;
  route: RouteType;
  app_type?: string;
  due_date?: string;
  courses: CourseIntakeItem[];
  documents: StatutoryDocumentPayload[];
  affidavit_accepted: boolean;
  signatory_designation: string;
}

export interface InstitutionalFilingResult {
  application: Application;
  correlation_token: string;
  total_intake: number;
  courses_count: number;
  documents_count: number;
  message: string;
}
