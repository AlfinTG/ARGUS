import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { 
  AppState, 
  Application, 
  Alert, 
  AuditEvent, 
  DemoSettings 
} from '../types/domain';
import type { RoleType } from '../types/index';
import { getInitialState, ROUTES } from '../data/seedData';
import { api } from '../api/client';

const STORAGE_KEY = 'argus_intelligence_v2';

interface AppContextType {
  state: AppState;
  isBackendConnected: boolean;
  refreshBackend: () => Promise<void>;
  setRole: (role: RoleType) => void;
  setSimDate: (date: string) => void;
  updateSettings: (settings: Partial<DemoSettings>) => void;
  setSelectedAppId: (id: string | null) => void;
  
  // Date Utilities
  dayDiff: (dateString: string | null | undefined) => number | null;
  dateLabel: (dateString: string | null | undefined) => string;
  
  // Role & Permissions
  can: (action: string) => boolean;
  deny: (actionLabel: string) => void;
  
  // Application Actions
  completeStage: (appId: string) => { ok: boolean; reason?: string };
  returnForDeficiency: (appId: string, reason: string) => { ok: boolean; reason?: string };
  resubmitApplication: (appId: string) => { ok: boolean; reason?: string };
  recordDecision: (appId: string, decision: 'Approved' | 'Rejected', remarks: string) => { ok: boolean; reason?: string };
  createApplication: (newApp: {
    institution: string;
    type: string;
    region: string;
    route: any;
    dueDate: string;
  }) => void;
  
  // Compliance Actions
  submitEvidence: (obligationId: string, note?: string) => void;
  verifyEvidence: (obligationId: string, verified: boolean, note?: string) => void;
  
  // EVC Desk Actions
  scheduleEVC: (evcId: string, visitDate: string, panel: string) => void;
  submitEVCReport: (evcId: string, outcome: 'Satisfactory' | 'Deficiencies Noted') => void;
  
  // Document Register Actions
  submitDocumentRenewal: (docId: string) => void;
  verifyDocumentRenewal: (docId: string, verified: boolean) => void;
  
  // Alert Actions
  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string) => void;
  
  // Automation Engine
  runAutomationCycle: () => { newAlertsCount: number; message: string };
  resetDemo: () => void;
  
  // Audit helper
  addAudit: (actor: string, target: string, type: any, detail: string, rule?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.apps && parsed.settings) {
          return parsed;
        }
      }
    } catch {
      // Local storage unavailable or corrupted
    }
    return getInitialState();
  });

  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // Sync with live REST backend when reachable
  const refreshBackend = useCallback(async () => {
    try {
      const healthy = await api.checkHealth();
      if (!healthy) {
        setIsBackendConnected(false);
        return;
      }
      await api.authenticateRole(state.role);
      const [apps, compliance, evcs, docs, alerts, audit, settings] = await Promise.all([
        api.getApplications(),
        api.getCompliance(),
        api.getEVC(),
        api.getDocuments(),
        api.getAlerts(),
        api.getAudit(),
        api.getRuleConfig(),
      ]);
      setState((prev) => ({
        ...prev,
        apps,
        compliance,
        evcs,
        docs,
        alerts,
        audit,
        settings: { ...prev.settings, ...settings },
      }));
      setIsBackendConnected(true);
    } catch {
      setIsBackendConnected(false);
    }
  }, [state.role]);

  useEffect(() => {
    refreshBackend();
  }, [state.role, refreshBackend]);

  // Save to localStorage on state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, [state]);

  const generateCorrelation = () => {
    return 'COR-' + Math.random().toString(36).substring(2, 9).toUpperCase();
  };

  const getNowStamp = () => {
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${state.simDate} ${time}`;
  };

  const dayDiff = (dateStr: string | null | undefined): number | null => {
    if (!dateStr) return null;
    const a = new Date(`${state.simDate}T12:00:00Z`).getTime();
    const b = new Date(`${dateStr}T12:00:00Z`).getTime();
    return Math.round((b - a) / 86400000);
  };

  const dateLabel = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '—';
    return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  };

  const can = (action: string): boolean => {
    const role = state.role;
    if (role === 'System Operator') return true;

    const permissions: Record<string, RoleType[]> = {
      complete: ['Scrutiny Officer', 'Regional Officer'],
      return: ['Scrutiny Officer', 'Regional Officer'],
      resubmit: ['Institution User'],
      schedule: ['Committee Coordinator'],
      evcReport: ['Committee Coordinator'],
      submitEvidence: ['Institution User'],
      verifyEvidence: ['Regional Officer', 'Competent Authority'],
      submitRenewal: ['Institution User'],
      verifyRenewal: ['Regional Officer', 'Competent Authority'],
      decision: ['Competent Authority'],
      create: ['Regional Officer'],
    };

    return (permissions[action] || []).includes(role);
  };

  const addAudit = (actor: string, target: string, type: any, detail: string, rule = '—') => {
    const event: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      time: getNowStamp(),
      actor,
      target,
      type,
      rule,
      detail,
      correlation: generateCorrelation(),
    };

    setState((prev) => ({
      ...prev,
      audit: [event, ...prev.audit].slice(0, 500),
    }));
  };

  const deny = (actionLabel: string) => {
    addAudit(state.role, 'Permission Guard', 'System', `Blocked unauthorized attempt: ${actionLabel}`);
  };

  const setRole = (role: RoleType) => {
    setState((prev) => ({ ...prev, role }));
  };

  const setSimDate = (simDate: string) => {
    setState((prev) => ({ ...prev, simDate }));
  };

  const updateSettings = (newSettings: Partial<DemoSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings },
    }));
  };

  const setSelectedAppId = (selectedAppId: string | null) => {
    setState((prev) => ({ ...prev, selectedAppId }));
  };

  // Application Workflow: Complete current stage
  const completeStage = (appId: string): { ok: boolean; reason?: string } => {
    if (!can('complete')) {
      deny(`Complete stage on ${appId}`);
      return { ok: false, reason: `Action not permitted for role: ${state.role}` };
    }

    const app = state.apps.find((a) => a.id === appId);
    if (!app) return { ok: false, reason: 'Application not found' };

    if (['EVC Scheduling', 'EVC Report Review'].includes(app.stage)) {
      return {
        ok: false,
        reason: 'EVC stages must be completed through the EVC desk after visit prerequisites are recorded.',
      };
    }

    if (app.stage === 'Decision Pending') {
      return { ok: false, reason: 'Final statutory decisions cannot be automated.' };
    }

    const routeSeq = ROUTES[app.route] || [];
    const currentIndex = routeSeq.indexOf(app.stage);
    if (currentIndex < 0 || currentIndex >= routeSeq.length - 1) {
      return { ok: false, reason: 'This route has no automatic next stage.' };
    }

    const nextStage = routeSeq[currentIndex + 1];
    let nextStatus = app.status;
    let nextOwner = app.ownerRole;

    if (nextStage === 'EVC Scheduling') {
      nextStatus = 'Awaiting EVC';
      nextOwner = 'Committee Coordinator';
    } else if (nextStage === 'Decision Pending') {
      nextStatus = 'Decision pending';
      nextOwner = 'Competent Authority';
    } else {
      nextStatus = 'In progress';
    }

    // Check if an EVC record is needed
    let updatedEvcs = [...state.evcs];
    if (nextStage === 'EVC Scheduling' && !state.evcs.some((e) => e.appId === app.id)) {
      updatedEvcs.push({
        id: `EVC-${app.id.replace('APP-', '')}`,
        appId: app.id,
        institution: app.institution,
        visitDate: '',
        panel: '',
        reportStatus: 'Not submitted',
        status: 'Needs scheduling',
        coordinatorRole: 'Committee Coordinator',
      });
    }

    const updatedApps = state.apps.map((a) =>
      a.id === appId
        ? {
            ...a,
            stage: nextStage,
            status: nextStatus,
            ownerRole: nextOwner,
            updatedAt: state.simDate,
          }
        : a
    );

    const auditEvent: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      time: getNowStamp(),
      actor: state.role,
      target: app.id,
      type: 'Workflow',
      rule: 'WF-01',
      detail: `Stage advanced from "${app.stage}" to "${nextStage}".`,
      correlation: generateCorrelation(),
    };

    setState((prev) => ({
      ...prev,
      apps: updatedApps,
      evcs: updatedEvcs,
      audit: [auditEvent, ...prev.audit],
    }));

    return { ok: true };
  };

  // Application Workflow: Return for deficiency
  const returnForDeficiency = (appId: string, reason: string): { ok: boolean; reason?: string } => {
    if (!can('return')) {
      deny(`Return application ${appId}`);
      return { ok: false, reason: `Action not permitted for role: ${state.role}` };
    }

    if (!reason || reason.trim().length === 0) {
      return { ok: false, reason: 'A deficiency return requires an explicit, meaningful reason.' };
    }

    const app = state.apps.find((a) => a.id === appId);
    if (!app) return { ok: false, reason: 'Application not found' };

    const updatedApps = state.apps.map((a) =>
      a.id === appId
        ? {
            ...a,
            stage: 'Institution Response' as const,
            status: 'Awaiting institution' as const,
            ownerRole: 'Institution User' as const,
            returnReason: reason.trim(),
            resumeStage: a.stage,
            updatedAt: state.simDate,
          }
        : a
    );

    const auditEvent: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      time: getNowStamp(),
      actor: state.role,
      target: app.id,
      type: 'Workflow',
      rule: 'WF-02',
      detail: `Deficiency returned to institution. Reason: "${reason.trim()}". Resume stage set to "${app.stage}".`,
      correlation: generateCorrelation(),
    };

    setState((prev) => ({
      ...prev,
      apps: updatedApps,
      audit: [auditEvent, ...prev.audit],
    }));

    return { ok: true };
  };

  // Application Workflow: Resubmit response
  const resubmitApplication = (appId: string): { ok: boolean; reason?: string } => {
    if (!can('resubmit')) {
      deny(`Resubmit response for ${appId}`);
      return { ok: false, reason: `Action not permitted for role: ${state.role}` };
    }

    const app = state.apps.find((a) => a.id === appId);
    if (!app) return { ok: false, reason: 'Application not found' };

    const resume = (app.resumeStage || 'Initial Scrutiny') as any;

    const updatedApps = state.apps.map((a) =>
      a.id === appId
        ? {
            ...a,
            stage: resume,
            status: 'In progress' as const,
            ownerRole: 'Scrutiny Officer' as const,
            returnReason: '',
            updatedAt: state.simDate,
          }
        : a
    );

    const auditEvent: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      time: getNowStamp(),
      actor: state.role,
      target: app.id,
      type: 'Workflow',
      rule: 'WF-02',
      detail: `Institution submitted response. Workflow resumed at "${resume}".`,
      correlation: generateCorrelation(),
    };

    setState((prev) => ({
      ...prev,
      apps: updatedApps,
      audit: [auditEvent, ...prev.audit],
    }));

    return { ok: true };
  };

  // Final Competent Authority Decision
  const recordDecision = (appId: string, decision: 'Approved' | 'Rejected', remarks: string): { ok: boolean; reason?: string } => {
    if (!can('decision')) {
      deny(`Final decision for ${appId}`);
      return { ok: false, reason: `Decision reserved for Competent Authority.` };
    }

    const updatedApps = state.apps.map((a) =>
      a.id === appId
        ? {
            ...a,
            stage: decision as any,
            status: (decision === 'Approved' ? 'Closed' : 'Rejected') as any,
            updatedAt: state.simDate,
          }
        : a
    );

    const auditEvent: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      time: getNowStamp(),
      actor: state.role,
      target: appId,
      type: 'Decision',
      rule: 'WF-FINAL',
      detail: `Statutory authority decision recorded: ${decision}. Remarks: "${remarks || 'None'}".`,
      correlation: generateCorrelation(),
    };

    setState((prev) => ({
      ...prev,
      apps: updatedApps,
      audit: [auditEvent, ...prev.audit],
    }));

    return { ok: true };
  };

  // Create Synthetic Application
  const createApplication = (newApp: {
    institution: string;
    type: string;
    region: string;
    route: any;
    dueDate: string;
  }) => {
    const id = `APP-2026-${String(Math.floor(100 + Math.random() * 900))}`;
    const initialStage = (ROUTES[newApp.route as keyof typeof ROUTES] || ['Initial Scrutiny'])[0];

    const appRecord: Application = {
      id,
      institution: newApp.institution,
      type: newApp.type,
      region: newApp.region,
      route: newApp.route,
      stage: initialStage,
      status: 'In progress',
      ownerRole: initialStage === 'EVC Scheduling' ? 'Committee Coordinator' : 'Scrutiny Officer',
      dueDate: newApp.dueDate,
      ageDays: 1,
      returnReason: '',
      resumeStage: '',
      updatedAt: state.simDate,
    };

    const auditEvent: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      time: getNowStamp(),
      actor: state.role,
      target: id,
      type: 'Workflow',
      rule: 'WF-CREATE',
      detail: `Synthetic application created with route "${newApp.route}". Initial stage: "${initialStage}".`,
      correlation: generateCorrelation(),
    };

    setState((prev) => ({
      ...prev,
      apps: [appRecord, ...prev.apps],
      audit: [auditEvent, ...prev.audit],
    }));
  };

  // Compliance: Submit evidence
  const submitEvidence = (obligationId: string, note = '') => {
    if (!can('submitEvidence')) {
      deny(`Submit evidence for ${obligationId}`);
      return;
    }

    const updated = state.compliance.map((c) =>
      c.id === obligationId
        ? {
            ...c,
            evidenceStatus: 'Submitted' as const,
            verification: 'Pending Verification' as const,
            note: note || c.note,
          }
        : c
    );

    const auditEvent: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      time: getNowStamp(),
      actor: state.role,
      target: obligationId,
      type: 'Compliance',
      rule: 'CMP-01',
      detail: `Compliance evidence submitted; verification remains pending by regional official.`,
      correlation: generateCorrelation(),
    };

    setState((prev) => ({
      ...prev,
      compliance: updated,
      audit: [auditEvent, ...prev.audit],
    }));
  };

  // Compliance: Verify evidence
  const verifyEvidence = (obligationId: string, verified: boolean, note = '') => {
    if (!can('verifyEvidence')) {
      deny(`Verify evidence for ${obligationId}`);
      return;
    }

    const outcome = verified ? 'Verified' : 'Rejected / clarification';
    const updated = state.compliance.map((c) =>
      c.id === obligationId
        ? {
            ...c,
            verification: outcome as any,
            note: note || c.note,
          }
        : c
    );

    const auditEvent: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      time: getNowStamp(),
      actor: state.role,
      target: obligationId,
      type: 'Compliance',
      rule: 'CMP-01',
      detail: `Evidence verification evaluated by official. Status set to "${outcome}". Note: ${note || 'None'}.`,
      correlation: generateCorrelation(),
    };

    setState((prev) => ({
      ...prev,
      compliance: updated,
      audit: [auditEvent, ...prev.audit],
    }));
  };

  // EVC Desk: Schedule Visit
  const scheduleEVC = (evcId: string, visitDate: string, panel: string) => {
    if (!can('schedule')) {
      deny(`Schedule EVC for ${evcId}`);
      return;
    }

    const updated = state.evcs.map((e) =>
      e.id === evcId
        ? {
            ...e,
            visitDate,
            panel,
            status: 'Scheduled' as const,
          }
        : e
    );

    const auditEvent: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      time: getNowStamp(),
      actor: state.role,
      target: evcId,
      type: 'EVC',
      rule: 'EVC-01',
      detail: `EVC visit scheduled for ${visitDate}. Assigned panel: "${panel}".`,
      correlation: generateCorrelation(),
    };

    setState((prev) => ({
      ...prev,
      evcs: updated,
      audit: [auditEvent, ...prev.audit],
    }));
  };

  // EVC Desk: Submit Report and Advance Case
  const submitEVCReport = (evcId: string, outcome: 'Satisfactory' | 'Deficiencies Noted') => {
    if (!can('evcReport')) {
      deny(`Submit EVC report for ${evcId}`);
      return;
    }

    const evc = state.evcs.find((e) => e.id === evcId);
    if (!evc) return;

    const updatedEvcs = state.evcs.map((e) =>
      e.id === evcId
        ? {
            ...e,
            reportStatus: 'Submitted' as const,
            status: 'Completed' as const,
          }
        : e
    );

    // If attached to application, advance case to next stage (e.g. Decision Pending or SAC/SHC Review)
    const updatedApps = state.apps.map((a) => {
      if (a.id === evc.appId) {
        const routeSeq = ROUTES[a.route] || [];
        const currentIndex = routeSeq.indexOf(a.stage);
        const nextStage = currentIndex >= 0 && currentIndex < routeSeq.length - 1 ? routeSeq[currentIndex + 1] : a.stage;
        return {
          ...a,
          stage: nextStage,
          status: (nextStage === 'Decision Pending' ? 'Decision pending' : 'In progress') as any,
          ownerRole: (nextStage === 'Decision Pending' ? 'Competent Authority' : a.ownerRole) as any,
          updatedAt: state.simDate,
        };
      }
      return a;
    });

    const auditEvent: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      time: getNowStamp(),
      actor: state.role,
      target: evcId,
      type: 'EVC',
      rule: 'EVC-02',
      detail: `EVC report submitted. Assessment outcome: ${outcome}. Related application advanced.`,
      correlation: generateCorrelation(),
    };

    setState((prev) => ({
      ...prev,
      evcs: updatedEvcs,
      apps: updatedApps,
      audit: [auditEvent, ...prev.audit],
    }));
  };

  // Documents: Submit renewal
  const submitDocumentRenewal = (docId: string) => {
    if (!can('submitRenewal')) {
      deny(`Submit renewal for ${docId}`);
      return;
    }

    const updated = state.docs.map((d) =>
      d.id === docId
        ? {
            ...d,
            renewalStatus: 'Submitted' as const,
            reviewStatus: 'Pending Verification' as const,
          }
        : d
    );

    const auditEvent: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      time: getNowStamp(),
      actor: state.role,
      target: docId,
      type: 'Document',
      rule: 'DOC-01',
      detail: `Document renewal uploaded by institution. Verification pending.`,
      correlation: generateCorrelation(),
    };

    setState((prev) => ({
      ...prev,
      docs: updated,
      audit: [auditEvent, ...prev.audit],
    }));
  };

  // Documents: Verify renewal
  const verifyDocumentRenewal = (docId: string, verified: boolean) => {
    if (!can('verifyRenewal')) {
      deny(`Verify renewal for ${docId}`);
      return;
    }

    const updated = state.docs.map((d) =>
      d.id === docId
        ? {
            ...d,
            renewalStatus: verified ? ('Verified' as const) : ('Not submitted' as const),
            reviewStatus: verified ? ('Verified' as const) : ('Not reviewed' as const),
            expiryDate: verified ? '2027-10-26' : d.expiryDate,
          }
        : d
    );

    const auditEvent: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      time: getNowStamp(),
      actor: state.role,
      target: docId,
      type: 'Document',
      rule: 'DOC-01',
      detail: verified
        ? `Document renewal verified by authority. Expiry date extended to 2027-10-26.`
        : `Document renewal rejected. Resubmission required.`,
      correlation: generateCorrelation(),
    };

    setState((prev) => ({
      ...prev,
      docs: updated,
      audit: [auditEvent, ...prev.audit],
    }));
  };

  // Alerts: Acknowledge & Resolve
  const acknowledgeAlert = (alertId: string) => {
    const updated = state.alerts.map((a) => (a.id === alertId ? { ...a, status: 'Acknowledged' as const } : a));
    addAudit(state.role, alertId, 'Alert', `Alert acknowledged by ${state.role}.`);
    setState((prev) => ({ ...prev, alerts: updated }));
  };

  const resolveAlert = (alertId: string) => {
    const updated = state.alerts.map((a) => (a.id === alertId ? { ...a, status: 'Resolved' as const } : a));
    addAudit(state.role, alertId, 'Alert', `Alert marked resolved by ${state.role}.`);
    setState((prev) => ({ ...prev, alerts: updated }));
  };

  // Automation Engine with Idempotency Protection
  const runAutomationCycle = (): { newAlertsCount: number; message: string } => {
    const newAlerts: Alert[] = [];
    const newProcessedKeys = new Set(state.processedKeys);
    let generatedAuditEvents: AuditEvent[] = [];

    // 1. Scan applications
    for (const app of state.apps) {
      if (['Closed', 'Rejected'].includes(app.status)) continue;
      const diff = dayDiff(app.dueDate);
      if (diff === null) continue;

      // Overdue Rule DL-02
      if (diff < 0) {
        const key = `${app.id}:DL-02:${app.dueDate}`;
        if (!newProcessedKeys.has(key)) {
          newProcessedKeys.add(key);
          newAlerts.push({
            id: `ALT-${Date.now().toString().slice(-4)}-${newAlerts.length}`,
            title: `Application Overdue: ${app.id}`,
            target: app.id,
            ruleId: 'DL-02',
            message: `Application is ${Math.abs(diff)} days past statutory scrutiny deadline (${app.dueDate}). Escalated to ${state.settings.escalationRole}.`,
            recipientRole: state.settings.escalationRole,
            createdAt: getNowStamp(),
            status: 'Open',
            processedKey: key,
          });
          generatedAuditEvents.push({
            id: `AUD-${Date.now().toString().slice(-4)}-${generatedAuditEvents.length}`,
            time: getNowStamp(),
            actor: 'Automation Engine',
            target: app.id,
            type: 'Automation',
            rule: 'DL-02',
            detail: `Rule DL-02 triggered: Overdue escalation alert generated for ${app.id}.`,
            correlation: generateCorrelation(),
          });
        }
      } 
      // Upcoming Deadline Rule DL-01
      else if (diff <= state.settings.reminderDays) {
        const key = `${app.id}:DL-01:${app.dueDate}`;
        if (!newProcessedKeys.has(key)) {
          newProcessedKeys.add(key);
          newAlerts.push({
            id: `ALT-${Date.now().toString().slice(-4)}-${newAlerts.length}`,
            title: `Deadline Approaching: ${app.id}`,
            target: app.id,
            ruleId: 'DL-01',
            message: `Stage "${app.stage}" due in ${diff} day(s) on ${app.dueDate}.`,
            recipientRole: app.ownerRole,
            createdAt: getNowStamp(),
            status: 'Open',
            processedKey: key,
          });
          generatedAuditEvents.push({
            id: `AUD-${Date.now().toString().slice(-4)}-${generatedAuditEvents.length}`,
            time: getNowStamp(),
            actor: 'Automation Engine',
            target: app.id,
            type: 'Automation',
            rule: 'DL-01',
            detail: `Rule DL-01 triggered: Reminder generated for ${app.id} (${diff}d remaining).`,
            correlation: generateCorrelation(),
          });
        }
      }
    }

    // 2. Scan compliance obligations
    for (const comp of state.compliance) {
      if (comp.verification === 'Verified') continue;
      const diff = dayDiff(comp.dueDate);
      if (diff === null) continue;

      if (diff < 0) {
        const key = `${comp.id}:DL-02:${comp.dueDate}`;
        if (!newProcessedKeys.has(key)) {
          newProcessedKeys.add(key);
          newAlerts.push({
            id: `ALT-${Date.now().toString().slice(-4)}-${newAlerts.length}`,
            title: `Overdue Obligation: ${comp.title}`,
            target: comp.id,
            ruleId: 'DL-02',
            message: `Institutional undertaking "${comp.title}" is ${Math.abs(diff)} days overdue.`,
            recipientRole: state.settings.escalationRole,
            createdAt: getNowStamp(),
            status: 'Open',
            processedKey: key,
          });
        }
      } else if (diff <= state.settings.reminderDays) {
        const key = `${comp.id}:DL-01:${comp.dueDate}`;
        if (!newProcessedKeys.has(key)) {
          newProcessedKeys.add(key);
          newAlerts.push({
            id: `ALT-${Date.now().toString().slice(-4)}-${newAlerts.length}`,
            title: `Obligation Due Soon: ${comp.title}`,
            target: comp.id,
            ruleId: 'DL-01',
            message: `Undertaking "${comp.title}" is due in ${diff} day(s).`,
            recipientRole: 'Institution User',
            createdAt: getNowStamp(),
            status: 'Open',
            processedKey: key,
          });
        }
      }
    }

    // 3. Scan documents
    for (const doc of state.docs) {
      if (doc.reviewStatus === 'Verified') continue;
      const diff = dayDiff(doc.expiryDate);
      if (diff === null) continue;

      if (diff < 0) {
        const key = `${doc.id}:DOC-01:EXPIRED:${doc.expiryDate}`;
        if (!newProcessedKeys.has(key)) {
          newProcessedKeys.add(key);
          newAlerts.push({
            id: `ALT-${Date.now().toString().slice(-4)}-${newAlerts.length}`,
            title: `Document Expired: ${doc.title}`,
            target: doc.id,
            ruleId: 'DOC-01',
            message: `Mandatory institutional certificate "${doc.title}" expired on ${doc.expiryDate}. Renewal required immediately.`,
            recipientRole: state.settings.escalationRole,
            createdAt: getNowStamp(),
            status: 'Open',
            processedKey: key,
          });
        }
      } else if (diff <= state.settings.expiryDays) {
        const key = `${doc.id}:DOC-01:WARNING:${doc.expiryDate}`;
        if (!newProcessedKeys.has(key)) {
          newProcessedKeys.add(key);
          newAlerts.push({
            id: `ALT-${Date.now().toString().slice(-4)}-${newAlerts.length}`,
            title: `Document Expiry Warning: ${doc.title}`,
            target: doc.id,
            ruleId: 'DOC-01',
            message: `Institutional certificate expires in ${diff} days (${doc.expiryDate}). Initiate renewal review.`,
            recipientRole: 'Institution User',
            createdAt: getNowStamp(),
            status: 'Open',
            processedKey: key,
          });
        }
      }
    }

    // Log the cycle audit
    const cycleSummaryEvent: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      time: getNowStamp(),
      actor: 'Automation Engine',
      target: 'System',
      type: 'Automation',
      rule: 'CYCLE-SCAN',
      detail: `Rule evaluation cycle executed. Scanned records: ${state.apps.length} cases, ${state.compliance.length} obligations, ${state.docs.length} docs. New alerts generated: ${newAlerts.length}.`,
      correlation: generateCorrelation(),
    };

    setState((prev) => ({
      ...prev,
      alerts: [...newAlerts, ...prev.alerts],
      processedKeys: Array.from(newProcessedKeys),
      audit: [cycleSummaryEvent, ...generatedAuditEvents, ...prev.audit],
    }));

    return {
      newAlertsCount: newAlerts.length,
      message:
        newAlerts.length > 0
          ? `Automation cycle completed: ${newAlerts.length} new actionable alert(s) generated.`
          : 'Cycle completed: No new alerts needed (all records up-to-date or already processed).',
    };
  };

  // Reset demo back to factory clean state
  const resetDemo = () => {
    localStorage.removeItem(STORAGE_KEY);
    const fresh = getInitialState();
    fresh.audit.unshift({
      id: `AUD-${Date.now().toString().slice(-4)}`,
      time: `${fresh.simDate} 12:00`,
      actor: 'System Operator',
      target: 'All Data',
      type: 'System',
      rule: 'RESET',
      detail: 'Demo database reset to factory synthetic state.',
      correlation: generateCorrelation(),
    });
    setState(fresh);
  };

  return (
    <AppContext.Provider
      value={{
        state,
        isBackendConnected,
        refreshBackend,
        setRole,
        setSimDate,
        updateSettings,
        setSelectedAppId,
        dayDiff,
        dateLabel,
        can,
        deny,
        completeStage,
        returnForDeficiency,
        resubmitApplication,
        recordDecision,
        createApplication,
        submitEvidence,
        verifyEvidence,
        scheduleEVC,
        submitEVCReport,
        submitDocumentRenewal,
        verifyDocumentRenewal,
        acknowledgeAlert,
        resolveAlert,
        runAutomationCycle,
        resetDemo,
        addAudit,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
