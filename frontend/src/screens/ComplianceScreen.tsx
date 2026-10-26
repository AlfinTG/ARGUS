import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { ScreenType } from '../types/index';
import type { ComplianceObligation } from '../types/domain';
import { GlassPanel } from '../components/GlassPanel';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Search, Upload, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface ComplianceScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const ComplianceScreen: React.FC<ComplianceScreenProps> = ({ onNavigate, onToast }) => {
  const { 
    state, 
    dayDiff, 
    dateLabel, 
    can, 
    submitEvidence, 
    verifyEvidence, 
    setSelectedAppId 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVerification, setSelectedVerification] = useState('');

  // Modals state
  const [selectedObligation, setSelectedObligation] = useState<ComplianceObligation | null>(null);
  
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [evidenceNoteInput, setEvidenceNoteInput] = useState('');

  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyChoice, setVerifyChoice] = useState<boolean>(true);
  const [verifyRemarksInput, setVerifyRemarksInput] = useState('');

  const filteredCompliance = useMemo(() => {
    return state.compliance.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || c.title.toLowerCase().includes(q) || c.institution.toLowerCase().includes(q) || c.appId.toLowerCase().includes(q);
      const matchesVerification = !selectedVerification || c.verification === selectedVerification;
      return matchesSearch && matchesVerification;
    });
  }, [state.compliance, searchQuery, selectedVerification]);

  const handleOpenSubmitModal = (c: ComplianceObligation) => {
    setSelectedObligation(c);
    setIsSubmitModalOpen(true);
  };

  const handleOpenVerifyModal = (c: ComplianceObligation) => {
    setSelectedObligation(c);
    setIsVerifyModalOpen(true);
  };

  const handleSubmitEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObligation) return;

    submitEvidence(selectedObligation.id, evidenceNoteInput.trim());
    onToast(`Evidence submitted for "${selectedObligation.title}". Verification is pending authorized scrutiny.`, 'success');
    setIsSubmitModalOpen(false);
    setEvidenceNoteInput('');
  };

  const handleVerifyEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObligation) return;

    verifyEvidence(selectedObligation.id, verifyChoice, verifyRemarksInput.trim());
    const outcomeText = verifyChoice ? 'Verified' : 'Rejected / clarification required';
    onToast(`Obligation "${selectedObligation.title}" evaluated: ${outcomeText}.`, 'info');
    setIsVerifyModalOpen(false);
    setVerifyRemarksInput('');
  };

  const handleOpenCase = (appId: string) => {
    setSelectedAppId(appId);
    onNavigate('case');
  };

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
          <div className="page-eyebrow">Institutional obligations & undertakings</div>
          <h1>Compliance & undertakings</h1>
          <p>
            Regulatory compliance monitoring. Submitting evidence changes the state to Pending Verification; only an authorized regulatory official can verify or reject evidence.
          </p>
        </div>
      </div>

      <GlassPanel>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search 
              size={16} 
              style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-faint)' }} 
            />
            <input
              type="text"
              placeholder="Search by undertaking, institution, or application ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 36, width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={selectedVerification}
              onChange={(e) => setSelectedVerification(e.target.value)}
              aria-label="Filter by verification state"
            >
              <option value="">All verification states</option>
              <option value="Not reviewed">Not reviewed</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Verified">Verified</option>
              <option value="Rejected / clarification">Rejected / clarification</option>
            </select>

            {(searchQuery || selectedVerification) && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedVerification('');
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Obligations Table */}
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Obligation</th>
                <th>Institution / Case</th>
                <th>Statutory due</th>
                <th>Evidence status</th>
                <th>Verification</th>
                <th>Reviewer role</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompliance.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--text-white)' }}>
                      {c.title}
                    </span>
                    <span className="table-subtext">{c.id}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{c.institution}</span>
                    <span 
                      className="table-id-link" 
                      onClick={() => handleOpenCase(c.appId)}
                      style={{ marginTop: 2 }}
                    >
                      {c.appId}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span>{dateLabel(c.dueDate)}</span>
                      {renderDueBadge(c.dueDate)}
                    </div>
                  </td>
                  <td>
                    <StatusBadge 
                      status={c.evidenceStatus} 
                      kind={c.evidenceStatus === 'Submitted' ? 'lime' : 'muted'} 
                    />
                  </td>
                  <td>
                    <StatusBadge status={c.verification} />
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {c.reviewerRole}
                    </span>
                  </td>
                  <td>
                    {c.evidenceStatus === 'Not submitted' || c.verification === 'Rejected / clarification' ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => handleOpenSubmitModal(c)}
                        disabled={!can('submitEvidence')}
                        title={can('submitEvidence') ? 'Upload compliance evidence' : 'Requires Institution User role'}
                      >
                        <Upload size={13} /> Submit evidence
                      </button>
                    ) : c.verification === 'Pending Verification' ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => handleOpenVerifyModal(c)}
                        disabled={!can('verifyEvidence')}
                        title={can('verifyEvidence') ? 'Verify or reject evidence' : 'Requires Regional Officer or Competent Authority'}
                      >
                        <ShieldCheck size={13} /> Review evidence
                      </button>
                    ) : (
                      <span className="pill pill-green">
                        <CheckCircle2 size={11} /> Verified
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredCompliance.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No compliance obligations matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {/* Submit Evidence Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title={`Submit Compliance Evidence: ${selectedObligation?.title}`}
        description="Provide compliance proof documentation or affidavit. Submission will place the obligation into Pending Verification."
        footerActions={
          <>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={() => setIsSubmitModalOpen(false)}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleSubmitEvidence}
            >
              Confirm Submission
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitEvidence} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)' }}>
              Evidence Document / Description *
            </label>
            <textarea
              rows={4}
              placeholder="e.g. Uploaded certified affidavit endorsing sanctioned faculty cadre ratio and AICTE Pay Scale compliance (DocRef: AFF-2026-F01)."
              value={evidenceNoteInput}
              onChange={(e) => setEvidenceNoteInput(e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
              required
            />
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
            <strong>Note:</strong> Submission records an immutable audit log. Only an authorized official may certify this obligation.
          </div>
        </form>
      </Modal>

      {/* Verify Evidence Modal */}
      <Modal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        title={`Regulatory Scrutiny: ${selectedObligation?.title}`}
        description="Statutory review of submitted institutional compliance undertaking."
        footerActions={
          <>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={() => setIsVerifyModalOpen(false)}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleVerifyEvidence}
            >
              Record Determination
            </button>
          </>
        }
      >
        <form onSubmit={handleVerifyEvidence} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)', display: 'block', marginBottom: 8 }}>
              Verification Determination *
            </label>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text-white)' }}>
                <input
                  type="radio"
                  name="verifyChoice"
                  value="true"
                  checked={verifyChoice === true}
                  onChange={() => setVerifyChoice(true)}
                />
                Accept & Verify Obligation
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text-white)' }}>
                <input
                  type="radio"
                  name="verifyChoice"
                  value="false"
                  checked={verifyChoice === false}
                  onChange={() => setVerifyChoice(false)}
                />
                Reject / Clarification Required
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)' }}>
              Scrutiny Remarks & Findings
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Scrutinized against statutory portal records; faculty roster confirmed valid."
              value={verifyRemarksInput}
              onChange={(e) => setVerifyRemarksInput(e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
