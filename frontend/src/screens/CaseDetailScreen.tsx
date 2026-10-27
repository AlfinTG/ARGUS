import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { ScreenType } from '../types/index';
import { ROUTES } from '../data/seedData';
import { GlassPanel } from '../components/GlassPanel';
import { StatusBadge } from '../components/StatusBadge';
import { StageTimeline } from '../components/StageTimeline';
import { Modal } from '../components/Modal';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  FileCheck, 
  Info,
  CalendarClock,
  FileText,
  Download,
  ShieldCheck,
  Eye,
} from 'lucide-react';

interface CaseDetailScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const CaseDetailScreen: React.FC<CaseDetailScreenProps> = ({ onNavigate, onToast }) => {
  const { 
    state, 
    dayDiff, 
    dateLabel, 
    can, 
    completeStage, 
    returnForDeficiency, 
    resubmitApplication, 
    recordDecision 
  } = useApp();

  const app = state.apps.find((a) => a.id === state.selectedAppId) || state.apps[0];

  // Modals State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnReasonInput, setReturnReasonInput] = useState('');

  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionChoice, setDecisionChoice] = useState<'Approved' | 'Rejected'>('Approved');
  const [decisionRemarks, setDecisionRemarks] = useState('');

  // Document Viewer Modal State
  const [viewerConfig, setViewerConfig] = useState<{
    isOpen: boolean;
    title: string;
    endpoint: string;
    fileName: string;
  } | null>(null);

  const handleOpenSummary = () => {
    setViewerConfig({
      isOpen: true,
      title: `Electronic Case Summary (ECS) — ${app.id}`,
      endpoint: `/api/v1/applications/${app.id}/summary`,
      fileName: `Case_Summary_${app.id}.pdf`,
    });
  };

  const handleOpenLetter = (type?: 'eoa' | 'deficiency') => {
    const isEoa = type === 'eoa' || app.stage === 'Approved';
    setViewerConfig({
      isOpen: true,
      title: isEoa
        ? `AICTE Extension of Approval (EoA) Sanction Order — ${app.id}`
        : `Statutory Deficiency Notice (WF-02) — ${app.id}`,
      endpoint: `/api/v1/applications/${app.id}/letter${type ? `?letter_type=${type}` : ''}`,
      fileName: isEoa ? `Sanction_Order_EoA_${app.id}.pdf` : `Deficiency_Notice_${app.id}.pdf`,
    });
  };

  if (!app) {
    return (
      <div className="panel" style={{ padding: 40, textAlign: 'center' }}>
        <h2>No application selected</h2>
        <p style={{ margin: '12px 0 20px' }}>Select an application from the case list to view scrutiny details.</p>
        <button type="button" className="btn btn-primary" onClick={() => onNavigate('applications')}>
          ← Return to Applications
        </button>
      </div>
    );
  }

  const routeStages = ROUTES[app.route] || [];
  const currentStageIndex = routeStages.indexOf(app.stage);
  const nextStage = currentStageIndex >= 0 && currentStageIndex < routeStages.length - 1 
    ? routeStages[currentStageIndex + 1] 
    : null;

  const handleCompleteStage = () => {
    const res = completeStage(app.id);
    if (res.ok) {
      onToast(`Application ${app.id} successfully advanced to next stage!`, 'success');
    } else {
      onToast(res.reason || 'Failed to complete stage.', 'warning');
    }
  };

  const handleReturnSubmit = () => {
    if (!returnReasonInput.trim()) {
      onToast('A deficiency return requires an explicit, meaningful reason.', 'warning');
      return;
    }
    const res = returnForDeficiency(app.id, returnReasonInput);
    if (res.ok) {
      onToast(`Deficiency recorded for ${app.id}. Assigned to institution for response.`, 'info');
      setIsReturnModalOpen(false);
      setReturnReasonInput('');
    } else {
      onToast(res.reason || 'Action failed.', 'warning');
    }
  };

  const handleResubmit = () => {
    const res = resubmitApplication(app.id);
    if (res.ok) {
      onToast(`Institution response submitted for ${app.id}. Scrutiny resumed!`, 'success');
    } else {
      onToast(res.reason || 'Resubmission failed.', 'warning');
    }
  };

  const handleDecisionSubmit = () => {
    const res = recordDecision(app.id, decisionChoice, decisionRemarks);
    if (res.ok) {
      onToast(`Statutory authority decision recorded: ${decisionChoice} for ${app.id}`, 'success');
      setIsDecisionModalOpen(false);
      setDecisionRemarks('');
    } else {
      onToast(res.reason || 'Decision recording failed.', 'warning');
    }
  };

  const caseAuditEvents = state.audit.filter((e) => e.target === app.id);

  const renderDueBadge = (dateStr: string | null | undefined) => {
    const diff = dayDiff(dateStr);
    if (diff === null) return <StatusBadge status="No deadline" kind="muted" />;
    if (diff < 0) return <StatusBadge status={`${Math.abs(diff)}d overdue`} kind="red" />;
    if (diff === 0) return <StatusBadge status="Due today" kind="amber" />;
    if (diff <= state.settings.reminderDays) return <StatusBadge status={`${diff}d left`} kind="amber" />;
    return <StatusBadge status="On track" kind="green" />;
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Application scrutiny & workflow</div>
          <h1>{app.id}</h1>
          <p>{app.institution} · {app.region} Region · {app.type}</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn btn-ghost" 
            onClick={() => onNavigate('applications')}
          >
            <ArrowLeft size={16} /> Back to applications
          </button>

          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={handleOpenSummary}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid var(--border-subtle)',
              background: 'rgba(255, 255, 255, 0.04)',
            }}
            title="Download or preview official Electronic Case Summary dossier"
          >
            <FileText size={14} color="var(--accent-lime)" />
            <span>Case Summary (ECS)</span>
          </button>

          {app.stage === 'Approved' && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => handleOpenLetter('eoa')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              title="Download AICTE Extension of Approval (EoA) Sanction Order"
            >
              <ShieldCheck size={14} />
              <span>Download Sanction Order</span>
            </button>
          )}

          {(app.returnReason || app.status === 'Awaiting institution') && (
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => handleOpenLetter('deficiency')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              title="Download Statutory Deficiency Notice memo"
            >
              <AlertTriangle size={14} />
              <span>Download Deficiency Memo</span>
            </button>
          )}
        </div>
      </div>

      {/* Case Hero Overview */}
      <div 
        className="glass-panel" 
        style={{ padding: 24, marginBottom: 20, background: 'rgba(11, 26, 18, 0.85)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span className="code-tag">{app.route}</span>
              <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Assigned Owner: {app.ownerRole}</span>
            </div>
            <h2 style={{ fontSize: 22, color: 'var(--text-white)', fontWeight: 800 }}>{app.institution}</h2>
          </div>
          <StatusBadge status={app.status} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 20 }}>
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', fontWeight: 700 }}>
              Current Stage
            </span>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-white)', marginTop: 4 }}>
              {app.stage}
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.25)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', fontWeight: 700 }}>
              Statutory Due Date
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-white)' }}>{dateLabel(app.dueDate)}</span>
              {renderDueBadge(app.dueDate)}
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.25)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', fontWeight: 700 }}>
              Application Age
            </span>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-white)', marginTop: 4 }}>
              {app.ageDays} days in process
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Workflow Controls & Metadata */}
      <div className="grid-2-cols">
        <div>
          {/* Stage Progression Timeline */}
          <GlassPanel title="Configured Route Progression" subtitle={`Profile: ${app.route}`}>
            <StageTimeline stages={routeStages} currentStage={app.stage} />

            {/* Notice about next stage */}
            <div className="notice-box notice-info" style={{ marginTop: 16 }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                Next eligible stage:{' '}
                <strong>{nextStage || 'No automatic next stage (Final Statutory Authority Scrutiny)'}</strong>.
                AICTE statutory scrutinies remain human-verified.
              </div>
            </div>

            {/* Deficiency Notice if active */}
            {app.returnReason && (
              <div 
                style={{ 
                  marginTop: 16, 
                  padding: 14, 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid rgba(239, 68, 68, 0.25)', 
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--red-text)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12 }}>
                  <AlertTriangle size={15} /> Deficiency Notice Recorded
                </div>
                <div style={{ fontSize: 13, marginTop: 6, color: 'var(--text-white)' }}>
                  "{app.returnReason}"
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Resume stage upon compliance: <strong>{app.resumeStage || 'Initial Scrutiny'}</strong>
                </div>
              </div>
            )}

            {/* Role-gated Action Bar */}
            <div style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {app.stage === 'Institution Response' ? (
                can('resubmit') ? (
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={handleResubmit}
                  >
                    <FileCheck size={16} /> Submit response & resume scrutiny
                  </button>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Awaiting institution submission. Switch role to <strong>Institution User</strong> to test resubmission.
                  </div>
                )
              ) : app.stage === 'Decision Pending' ? (
                can('decision') ? (
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={() => setIsDecisionModalOpen(true)}
                  >
                    <CheckCircle2 size={16} /> Record human decision
                  </button>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Case is pending final statutory determination. Switch role to <strong>Competent Authority</strong> to record approval/rejection.
                  </div>
                )
              ) : ['EVC Scheduling', 'EVC Report Review'].includes(app.stage) ? (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={() => onNavigate('evc')}
                  >
                    <CalendarClock size={16} /> Open EVC desk for visit scheduling
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-danger"
                    onClick={() => setIsReturnModalOpen(true)}
                    disabled={!can('return')}
                  >
                    Return for deficiency
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={handleCompleteStage}
                    disabled={!can('complete')}
                  >
                    <CheckCircle2 size={16} /> Complete current stage →
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-danger"
                    onClick={() => setIsReturnModalOpen(true)}
                    disabled={!can('return')}
                  >
                    Return for deficiency
                  </button>
                  {!can('complete') && (
                    <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
                      Current role ({state.role}) cannot perform scrutiny transitions.
                    </span>
                  )}
                </div>
              )}
            </div>
          </GlassPanel>

          {/* Case-specific Audit Event Trail */}
          <GlassPanel 
            title="Case-Specific Audit Trail" 
            subtitle={`${caseAuditEvents.length} regulatory events recorded for ${app.id}`}
          >
            <div className="activity-stream">
              {caseAuditEvents.map((e) => (
                <div key={e.id} className="activity-item">
                  <div className="activity-icon-badge">
                    {e.type === 'Workflow' ? '→' : e.type === 'Automation' ? '↻' : '•'}
                  </div>
                  <div className="activity-content">
                    <div className="activity-detail">{e.detail}</div>
                    <div className="activity-meta">
                      <span>{e.time}</span>
                      <span>·</span>
                      <span>{e.actor}</span>
                      <span>·</span>
                      <span className="code-tag">{e.rule}</span>
                      <span>·</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{e.correlation}</span>
                    </div>
                  </div>
                </div>
              ))}
              {caseAuditEvents.length === 0 && (
                <div className="empty-state">No audit events logged for this application yet.</div>
              )}
            </div>
          </GlassPanel>
        </div>

        {/* Right Column: Case Facts & Guidelines */}
        <div>
          <GlassPanel title="Case Scrutiny Facts" subtitle="Synthetic Institutional Record">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Full Institution Title
                </span>
                <div style={{ fontSize: 13, color: 'var(--text-white)', fontWeight: 600, marginTop: 2 }}>
                  {app.institution}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Application Category
                </span>
                <div style={{ fontSize: 13, color: 'var(--text-white)', fontWeight: 600, marginTop: 2 }}>
                  {app.type} ({app.region} Region)
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Workflow Profile
                </span>
                <div style={{ fontSize: 13, color: 'var(--text-white)', fontWeight: 600, marginTop: 2 }}>
                  {app.route}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Responsible Official Role
                </span>
                <div style={{ fontSize: 13, color: 'var(--text-white)', fontWeight: 600, marginTop: 2 }}>
                  {app.ownerRole}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Last Updated Date
                </span>
                <div style={{ fontSize: 13, color: 'var(--text-white)', fontWeight: 600, marginTop: 2 }}>
                  {app.updatedAt}
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* Official Administrative Documents */}
        <div>
          <GlassPanel title="Official Administrative Documents" subtitle="Standardized Letters & Dossiers">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Cryptographically signed regulatory communications with immutable audit correlation and verification QR code.
              </div>

              {/* ECS Button */}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleOpenSummary}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileText size={18} color="var(--accent-lime)" />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-white)' }}>
                      Download Official Case Summary
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                      Full dossier with stage timestamps &amp; findings
                    </div>
                  </div>
                </div>
                <Eye size={14} color="var(--accent-lime)" />
              </button>

              {/* Sanction Order Button (EoA) */}
              {app.stage === 'Approved' ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleOpenLetter('eoa')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ShieldCheck size={18} />
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                        Download Sanction Order (EoA)
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.85 }}>
                        Approved intake schedule &amp; QR verification
                      </div>
                    </div>
                  </div>
                  <Download size={14} />
                </button>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    opacity: 0.65,
                  }}
                  title="Sanction order requires final Competent Authority approval"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ShieldCheck size={18} color="var(--text-faint)" />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                        Sanction Order (EoA) Locked
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>
                        Available upon approval (Current: {app.stage})
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Deficiency Notice Button */}
              {(app.returnReason || app.status === 'Awaiting institution') && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleOpenLetter('deficiency')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertTriangle size={18} />
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                        Download Deficiency Notice (WF-02)
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.85 }}>
                        Statutory memo with rectification directives
                      </div>
                    </div>
                  </div>
                  <Download size={14} />
                </button>
              )}
            </div>
          </GlassPanel>

          <GlassPanel title="AICTE Invariants" subtitle="Regulatory Integrity Protocol">
            <ul style={{ paddingLeft: 18, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <li style={{ marginBottom: 6 }}>
                <strong>Non-universal routes:</strong> Approval workflows adapt to the institution's configured route rather than a hardcoded single path.
              </li>
              <li style={{ marginBottom: 6 }}>
                <strong>Traceable deficiency:</strong> A return requires a specific explanation and retains the resume stage to prevent infinite loops.
              </li>
              <li style={{ marginBottom: 6 }}>
                <strong>Statutory scrutiny:</strong> Automated rules only issue reminders and queue checks; final approvals require human official signatures.
              </li>
            </ul>
          </GlassPanel>
        </div>
      </div>

      {/* Return for Deficiency Modal */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title={`Return for Deficiency: ${app.id}`}
        description="Specify the exact regulatory deficiency. The case will be routed to the institution and resume scrutiny upon resubmission."
        footerActions={
          <>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={() => setIsReturnModalOpen(false)}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-danger"
              onClick={handleReturnSubmit}
            >
              Confirm Deficiency Return
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)' }}>
            Deficiency Reason *
          </label>
          <textarea
            rows={4}
            placeholder="e.g. Provide the missing signed faculty affidavit and building occupancy certificate."
            value={returnReasonInput}
            onChange={(e) => setReturnReasonInput(e.target.value)}
            style={{ width: '100%', resize: 'vertical' }}
            required
          />
          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
            Resume stage upon resubmission will be preserved as: <strong>{app.stage}</strong>
          </div>
        </div>
      </Modal>

      {/* Record Decision Modal */}
      <Modal
        isOpen={isDecisionModalOpen}
        onClose={() => setIsDecisionModalOpen(false)}
        title={`Statutory Determination: ${app.id}`}
        description="Record final regulatory determination by the Competent Authority."
        footerActions={
          <>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={() => setIsDecisionModalOpen(false)}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleDecisionSubmit}
            >
              Record Decision
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)', display: 'block', marginBottom: 8 }}>
              Authority Determination *
            </label>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text-white)' }}>
                <input
                  type="radio"
                  name="decisionChoice"
                  value="Approved"
                  checked={decisionChoice === 'Approved'}
                  onChange={() => setDecisionChoice('Approved')}
                />
                Approved
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text-white)' }}>
                <input
                  type="radio"
                  name="decisionChoice"
                  value="Rejected"
                  checked={decisionChoice === 'Rejected'}
                  onChange={() => setDecisionChoice('Rejected')}
                />
                Rejected
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)' }}>
              Determination Remarks & Order Reference
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Approved pursuant to SAC committee report and regional scrutiny verification."
              value={decisionRemarks}
              onChange={(e) => setDecisionRemarks(e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>
      </Modal>

      {/* In-Browser Document Viewer Modal for ECS & Sanction/Deficiency Letters */}
      {viewerConfig && (
        <DocumentViewerModal
          isOpen={viewerConfig.isOpen}
          onClose={() => setViewerConfig(null)}
          title={viewerConfig.title}
          documentId={app.id}
          endpoint={viewerConfig.endpoint}
          fileName={viewerConfig.fileName}
          mimeType="application/pdf"
        />
      )}
    </div>
  );
};
