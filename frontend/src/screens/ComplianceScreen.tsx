import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { ScreenType } from '../types/index';
import type { ComplianceObligation } from '../types/domain';
import { GlassPanel } from '../components/GlassPanel';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { FileUploadDropzone } from '../components/FileUploadDropzone';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { api } from '../api/client';
import { Search, Upload, ShieldCheck, CheckCircle2, Eye, FileText, Lock } from 'lucide-react';

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
    setSelectedAppId,
    refreshBackend 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVerification, setSelectedVerification] = useState('');

  // Modals state
  const [selectedObligation, setSelectedObligation] = useState<ComplianceObligation | null>(null);
  
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [evidenceNoteInput, setEvidenceNoteInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyChoice, setVerifyChoice] = useState<boolean>(true);
  const [verifyRemarksInput, setVerifyRemarksInput] = useState('');

  // In-Browser Evidence Preview Modal
  const [viewerObligation, setViewerObligation] = useState<ComplianceObligation | null>(null);

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
    setSelectedFile(null);
    setEvidenceNoteInput(c.note || '');
    setIsSubmitModalOpen(true);
  };

  const handleOpenVerifyModal = (c: ComplianceObligation) => {
    setSelectedObligation(c);
    setIsVerifyModalOpen(true);
  };

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObligation) return;

    setUploading(true);
    try {
      if (selectedFile) {
        // Upload real binary with SHA-256 integrity verification
        const result = await api.uploadComplianceBinary(selectedObligation.id, selectedFile);
        if (refreshBackend) await refreshBackend();
        onToast(
          `Evidence binary "${result.fileName}" uploaded. SHA-256: ${result.checksumSha256.slice(0, 8)}… Pending official verification.`,
          'success'
        );
      } else {
        // Text note submission
        submitEvidence(selectedObligation.id, evidenceNoteInput.trim());
        onToast(`Evidence submitted for "${selectedObligation.title}". Verification is pending authorized scrutiny.`, 'success');
      }
      setIsSubmitModalOpen(false);
      setEvidenceNoteInput('');
      setSelectedFile(null);
    } catch (err: any) {
      onToast(err.message || 'Failed to upload compliance evidence.', 'warning');
    } finally {
      setUploading(false);
    }
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
          <div className="page-eyebrow">Institutional obligations &amp; undertakings</div>
          <h1>Compliance &amp; undertakings</h1>
          <p>
            Regulatory compliance monitoring. Submitting evidence changes the state to Pending Verification; only an authorized regulatory official can verify or reject evidence with cryptographic SHA-256 auditing.
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
              placeholder="Search by title, institution, or case ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 36, width: '100%' }}
            />
          </div>

          <div style={{ width: 220 }}>
            <select
              value={selectedVerification}
              onChange={(e) => setSelectedVerification(e.target.value)}
            >
              <option value="">All verification states</option>
              <option value="Not reviewed">Not reviewed</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Verified">Verified</option>
              <option value="Rejected / clarification">Rejected / clarification</option>
            </select>
          </div>
        </div>

        {/* Obligations Table */}
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Obligation</th>
                <th>Institution</th>
                <th>Application</th>
                <th>Due date</th>
                <th>Evidence status</th>
                <th>Verification</th>
                <th>Evidence File</th>
                <th>Reviewer</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompliance.map((c) => {
                const hasFile = Boolean(c.fileName || c.evidenceStatus === 'Submitted');

                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-white)' }}>
                          {c.title}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                          ID: {c.id}
                        </span>
                      </div>
                    </td>
                    <td>{c.institution}</td>
                    <td>
                      <span 
                        className="clickable-ref" 
                        onClick={() => handleOpenCase(c.appId)}
                        title={`Open case record for ${c.appId}`}
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
                      {hasFile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => setViewerObligation(c)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 11.5,
                              padding: '3px 8px',
                              background: 'rgba(212, 244, 88, 0.08)',
                              border: '1px solid rgba(212, 244, 88, 0.25)',
                              color: 'var(--accent-lime)',
                            }}
                            title="Preview submitted evidence PDF/image binary"
                          >
                            <Eye size={12} />
                            <span>Preview</span>
                          </button>
                          {c.checksumSha256 && (
                            <span
                              style={{
                                fontSize: 10,
                                fontFamily: 'var(--font-mono)',
                                color: 'var(--text-faint)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                              title={`SHA-256: ${c.checksumSha256}`}
                            >
                              <Lock size={9} /> {c.checksumSha256.slice(0, 8)}…
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>No binary</span>
                      )}
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
                );
              })}
              {filteredCompliance.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty-state">
                    No compliance obligations matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {/* Submit Evidence Modal with Drag-and-Drop Binary Upload */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title={`Submit Compliance Evidence: ${selectedObligation?.title}`}
        description="Provide compliance proof documentation or affidavit (PDF/JPEG/PNG, max 10MB). Cryptographic checksum will be anchored on upload."
        footerActions={
          <>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={() => setIsSubmitModalOpen(false)}
              disabled={uploading}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleSubmitEvidence}
              disabled={uploading}
            >
              {uploading ? 'Securing & Uploading…' : 'Confirm Submission'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitEvidence} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* File Upload Dropzone */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)' }}>
              Evidence Document File (PDF, JPEG, or PNG) *
            </label>
            <FileUploadDropzone
              selectedFile={selectedFile}
              onFileSelected={(file) => setSelectedFile(file)}
              maxSizeBytes={10 * 1024 * 1024}
              allowedExtensions={['.pdf', '.jpg', '.jpeg', '.png']}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)' }}>
              Evidence Explanatory Note / Reference
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Uploaded certified affidavit endorsing sanctioned faculty cadre ratio and AICTE Pay Scale compliance (DocRef: AFF-2026-F01)."
              value={evidenceNoteInput}
              onChange={(e) => setEvidenceNoteInput(e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </form>
      </Modal>

      {/* Verify Evidence Modal with Live Document Preview */}
      <Modal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        title={`Verify Compliance: ${selectedObligation?.title}`}
        description="Statutory authenticity evaluation. Review evidence documents before accepting or requesting clarifications."
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
        <form onSubmit={handleVerifyEvidence} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Live Preview Button */}
          {selectedObligation && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'rgba(212, 244, 88, 0.05)',
                border: '1px solid rgba(212, 244, 88, 0.2)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} color="var(--accent-lime)" />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-white)' }}>
                    {selectedObligation.fileName || `${selectedObligation.title}_evidence.pdf`}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                    {selectedObligation.checksumSha256 ? `SHA-256: ${selectedObligation.checksumSha256.slice(0, 16)}…` : 'Awaiting verification'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setViewerObligation(selectedObligation)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Eye size={13} /> View Evidence
              </button>
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)', display: 'block', marginBottom: 8 }}>
              Official Evaluation *
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
                Accept &amp; Verify Evidence
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text-white)' }}>
                <input
                  type="radio"
                  name="verifyChoice"
                  value="false"
                  checked={verifyChoice === false}
                  onChange={() => setVerifyChoice(false)}
                />
                Reject / Request Clarification
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)' }}>
              Official Scrutiny Remarks
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Scrutinized and verified. Faculty recruitment orders match mandatory cadre ratio specifications."
              value={verifyRemarksInput}
              onChange={(e) => setVerifyRemarksInput(e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </form>
      </Modal>

      {/* In-Browser Evidence Preview Modal */}
      {viewerObligation && (
        <DocumentViewerModal
          isOpen={Boolean(viewerObligation)}
          onClose={() => setViewerObligation(null)}
          title={viewerObligation.title}
          documentId={viewerObligation.id}
          endpoint={`/api/v1/compliance/${viewerObligation.id}/file`}
          fileName={viewerObligation.fileName || `${viewerObligation.title.replace(/\s+/g, '_')}.pdf`}
          fileSize={viewerObligation.fileSize}
          mimeType={viewerObligation.mimeType || 'application/pdf'}
          checksumSha256={viewerObligation.checksumSha256}
          uploadedAt={viewerObligation.uploadedAt}
        />
      )}
    </div>
  );
};
