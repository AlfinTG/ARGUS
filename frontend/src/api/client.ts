import type {
  Application,
  ComplianceObligation,
  EVCTask,
  DocumentRecord,
  Alert,
  AuditEvent,
  AutomationRule,
  DemoSettings,
  FileUploadResult,
} from '../types/domain';
import type { RoleType } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

// Demo credentials mapping for instant role switching
const ROLE_CREDENTIALS: Record<RoleType, { email: string; pass: string }> = {
  'Scrutiny Officer': { email: 'scrutiny@aicte.gov.in', pass: 'Demo@2026!' },
  'Institution User': { email: 'institution@shivneri.edu.in', pass: 'Demo@2026!' },
  'Committee Coordinator': { email: 'coordinator@aicte.gov.in', pass: 'Demo@2026!' },
  'Regional Officer': { email: 'regional@aicte.gov.in', pass: 'Demo@2026!' },
  'Competent Authority': { email: 'authority@aicte.gov.in', pass: 'Demo@2026!' },
  'System Operator': { email: 'operator@aicte.gov.in', pass: 'Demo@2026!' },
};

let currentToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  currentToken = token;
  if (token) {
    localStorage.setItem('argus_jwt', token);
  } else {
    localStorage.removeItem('argus_jwt');
  }
};

export const getAuthToken = (): string | null => {
  if (!currentToken) {
    currentToken = localStorage.getItem('argus_jwt');
  }
  return currentToken;
};

// Transformers to map snake_case to frontend camelCase
function transformApp(raw: any): Application {
  return {
    id: raw.id,
    institution: raw.institution,
    type: raw.app_type,
    region: raw.region,
    route: raw.route,
    stage: raw.stage,
    status: raw.status,
    ownerRole: raw.owner_role,
    dueDate: raw.due_date,
    ageDays: raw.age_days,
    returnReason: raw.return_reason || '',
    resumeStage: raw.resume_stage || '',
    updatedAt: raw.updated_at,
  };
}

function transformCompliance(raw: any): ComplianceObligation {
  return {
    id: raw.id,
    title: raw.title,
    appId: raw.app_id,
    institution: raw.institution,
    dueDate: raw.due_date,
    evidenceStatus: raw.evidence_status,
    verification: raw.verification,
    reviewerRole: raw.reviewer_role,
    note: raw.note || '',
    fileName: raw.file_name || undefined,
    filePath: raw.file_path || undefined,
    fileSize: raw.file_size || undefined,
    mimeType: raw.mime_type || undefined,
    checksumSha256: raw.checksum_sha256 || undefined,
    uploadedAt: raw.uploaded_at || undefined,
  };
}

function transformEVC(raw: any): EVCTask {
  return {
    id: raw.id,
    appId: raw.app_id,
    institution: raw.institution,
    visitDate: raw.visit_date || '',
    panel: raw.panel || '',
    reportStatus: raw.report_status,
    status: raw.status,
    coordinatorRole: raw.coordinator_role,
  };
}

function transformDoc(raw: any): DocumentRecord {
  return {
    id: raw.id,
    title: raw.title,
    institution: raw.institution,
    expiryDate: raw.expiry_date,
    renewalStatus: raw.renewal_status,
    reviewStatus: raw.review_status,
    ownerRole: raw.owner_role,
    fileName: raw.file_name || undefined,
    filePath: raw.file_path || undefined,
    fileSize: raw.file_size || undefined,
    mimeType: raw.mime_type || undefined,
    checksumSha256: raw.checksum_sha256 || undefined,
    uploadedAt: raw.uploaded_at || undefined,
  };
}

function transformAlert(raw: any): Alert {
  return {
    id: raw.id,
    title: raw.title,
    target: raw.target,
    ruleId: raw.rule_id,
    message: raw.message,
    recipientRole: raw.recipient_role,
    createdAt: raw.created_at,
    status: raw.status,
    processedKey: raw.processed_key || '',
  };
}

function transformAudit(raw: any): AuditEvent {
  return {
    id: raw.id,
    time: raw.time,
    actor: raw.actor,
    target: raw.target,
    type: raw.event_type,
    rule: raw.rule,
    detail: raw.detail,
    correlation: raw.correlation,
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${endpoint}`;
  const resp = await fetch(url, { ...options, headers });

  if (!resp.ok) {
    const errorBody = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(errorBody.detail || `Request failed with status ${resp.status}`);
  }

  return resp.json();
}

async function uploadRequest<T>(endpoint: string, formData: FormData): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${endpoint}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!resp.ok) {
    let errorDetail = `Upload failed with status ${resp.status}`;
    try {
      const errJson = await resp.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // not JSON
    }
    throw new Error(errorDetail);
  }

  return resp.json();
}

export const api = {
  async checkHealth(): Promise<boolean> {
    try {
      const resp = await fetch(`${BASE_URL}/api/v1/health`, { method: 'GET' });
      return resp.ok;
    } catch {
      return false;
    }
  },

  async login(email: string, pass: string): Promise<any> {
    const resp = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: 'Invalid credentials' }));
      throw new Error(err.detail || 'Login failed');
    }

    const data = await resp.json();
    setAuthToken(data.access_token);
    return data;
  },

  async signup(payload: {
    email: string;
    password: string;
    full_name: string;
    role: string;
    institution_id?: string;
    region?: string;
  }): Promise<any> {
    const resp = await fetch(`${BASE_URL}/api/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }

    const data = await resp.json();
    setAuthToken(data.access_token);
    return data;
  },

  async googleAuth(payload: {
    credential: string;
    email?: string;
    full_name?: string;
    role?: string;
    institution_id?: string;
    region?: string;
  }): Promise<any> {
    const resp = await fetch(`${BASE_URL}/api/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: 'Google sign-in failed' }));
      throw new Error(err.detail || 'Google sign-in failed');
    }

    const data = await resp.json();
    setAuthToken(data.access_token);
    return data;
  },

  async authenticateRole(role: RoleType): Promise<string> {
    const creds = ROLE_CREDENTIALS[role];
    if (!creds) throw new Error(`No credentials defined for role: ${role}`);

    const resp = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: creds.email, password: creds.pass }),
    });

    if (!resp.ok) {
      throw new Error(`Login failed for ${creds.email}`);
    }

    const data = await resp.json();
    setAuthToken(data.access_token);
    return data.access_token;
  },

  async getApplications(): Promise<Application[]> {
    const raw = await request<any[]>('/api/v1/applications/');
    return raw.map(transformApp);
  },

  async createApplication(data: {
    institution: string;
    type: string;
    region: string;
    route: string;
    dueDate: string;
  }): Promise<Application> {
    const raw = await request<any>('/api/v1/applications/', {
      method: 'POST',
      body: JSON.stringify({
        institution: data.institution,
        app_type: data.type,
        region: data.region,
        route: data.route,
        due_date: data.dueDate,
      }),
    });
    return transformApp(raw);
  },

  async transitionApplication(
    id: string,
    action: 'complete' | 'return' | 'resubmit' | 'decision',
    opts?: { reason?: string; decision?: string; remarks?: string }
  ): Promise<Application> {
    const payload: any = { action };
    if (opts?.reason) payload.reason = opts.reason;
    if (opts?.decision) payload.decision = opts.decision;
    if (opts?.remarks) payload.remarks = opts.remarks;

    const raw = await request<any>(`/api/v1/applications/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return transformApp(raw);
  },

  async getCompliance(): Promise<ComplianceObligation[]> {
    const raw = await request<any[]>('/api/v1/compliance/');
    return raw.map(transformCompliance);
  },

  async submitComplianceEvidence(id: string, note: string): Promise<ComplianceObligation> {
    const raw = await request<any>(`/api/v1/compliance/${id}/evidence`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
    return transformCompliance(raw);
  },

  async verifyCompliance(id: string, verified: boolean, remarks?: string): Promise<ComplianceObligation> {
    const raw = await request<any>(`/api/v1/compliance/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ verified, remarks: remarks || '' }),
    });
    return transformCompliance(raw);
  },

  async getEVC(): Promise<EVCTask[]> {
    const raw = await request<any[]>('/api/v1/evc/');
    return raw.map(transformEVC);
  },

  async scheduleEVC(id: string, visitDate: string, panel: string): Promise<EVCTask> {
    const raw = await request<any>(`/api/v1/evc/${id}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ visit_date: visitDate, panel }),
    });
    return transformEVC(raw);
  },

  async submitEVCReport(id: string, outcome: string, remarks: string): Promise<EVCTask> {
    const raw = await request<any>(`/api/v1/evc/${id}/report`, {
      method: 'POST',
      body: JSON.stringify({ outcome, remarks }),
    });
    return transformEVC(raw);
  },

  async getDocuments(): Promise<DocumentRecord[]> {
    const raw = await request<any[]>('/api/v1/documents/');
    return raw.map(transformDoc);
  },

  async uploadDocumentBinary(id: string, file: File): Promise<FileUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    const raw = await uploadRequest<any>(`/api/v1/documents/${id}/upload`, formData);
    return {
      id: raw.id,
      fileName: raw.file_name,
      filePath: raw.file_path,
      fileSize: raw.file_size,
      mimeType: raw.mime_type,
      checksumSha256: raw.checksum_sha256,
      previewUrl: raw.preview_url,
    };
  },

  async uploadComplianceBinary(id: string, file: File): Promise<FileUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    const raw = await uploadRequest<any>(`/api/v1/compliance/${id}/upload`, formData);
    return {
      id: raw.id,
      fileName: raw.file_name,
      filePath: raw.file_path,
      fileSize: raw.file_size,
      mimeType: raw.mime_type,
      checksumSha256: raw.checksum_sha256,
      previewUrl: raw.preview_url,
    };
  },

  async fetchSecureBlobUrl(endpoint: string): Promise<string> {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      throw new Error(`Failed to load file preview: HTTP ${resp.status}`);
    }
    const blob = await resp.blob();
    return URL.createObjectURL(blob);
  },

  async submitDocumentRenewal(id: string, note: string): Promise<DocumentRecord> {
    const raw = await request<any>(`/api/v1/documents/${id}/renewal`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
    return transformDoc(raw);
  },

  async verifyDocument(id: string, verified: boolean, remarks?: string): Promise<DocumentRecord> {
    const raw = await request<any>(`/api/v1/documents/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ verified, remarks: remarks || '' }),
    });
    return transformDoc(raw);
  },

  async getAlerts(status?: string): Promise<Alert[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    const raw = await request<any[]>(`/api/v1/alerts/${q}`);
    return raw.map(transformAlert);
  },

  async acknowledgeAlert(id: string): Promise<Alert> {
    const raw = await request<any>(`/api/v1/alerts/${id}/ack`, {
      method: 'POST',
    });
    return transformAlert(raw);
  },

  async resolveAlert(id: string, note?: string): Promise<Alert> {
    const raw = await request<any>(`/api/v1/alerts/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ note: note || '' }),
    });
    return transformAlert(raw);
  },

  async getRules(): Promise<AutomationRule[]> {
    return request<AutomationRule[]>('/api/v1/rules/');
  },

  async getRuleConfig(): Promise<DemoSettings> {
    const raw = await request<any>('/api/v1/rules/config');
    return {
      reminderDays: raw.reminder_days,
      expiryDays: raw.expiry_days,
      escalationRole: raw.escalation_role as RoleType,
      policyVersion: raw.policy_version,
    };
  },

  async updateRuleConfig(settings: Partial<DemoSettings>): Promise<DemoSettings> {
    const payload: any = {};
    if (settings.reminderDays !== undefined) payload.reminder_days = settings.reminderDays;
    if (settings.expiryDays !== undefined) payload.expiry_days = settings.expiryDays;
    if (settings.escalationRole !== undefined) payload.escalation_role = settings.escalationRole;
    if (settings.policyVersion !== undefined) payload.policy_version = settings.policyVersion;

    const raw = await request<any>('/api/v1/rules/config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return {
      reminderDays: raw.reminder_days,
      expiryDays: raw.expiry_days,
      escalationRole: raw.escalation_role as RoleType,
      policyVersion: raw.policy_version,
    };
  },

  async evaluateRules(asOfDate?: string): Promise<{
    evaluated_applications: number;
    evaluated_compliance: number;
    evaluated_documents: number;
    alerts_spawned: number;
    skipped_duplicates: number;
    message: string;
  }> {
    const q = asOfDate ? `?as_of_date=${encodeURIComponent(asOfDate)}` : '';
    return request<any>(`/api/v1/rules/evaluate${q}`, {
      method: 'POST',
    });
  },

  async getAudit(): Promise<AuditEvent[]> {
    const raw = await request<any[]>('/api/v1/audit/');
    return raw.map(transformAudit);
  },
};
