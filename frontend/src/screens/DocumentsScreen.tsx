import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { ScreenType } from '../types/index';
import type { DocumentRecord } from '../types/domain';
import { GlassPanel } from '../components/GlassPanel';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { FileUploadDropzone } from '../components/FileUploadDropzone';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { api } from '../api/client';
import { Search, Upload, ShieldCheck, CheckCircle2, Eye, FileText, Lock } from 'lucide-react';

interface DocumentsScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const DocumentsScreen: React.FC<DocumentsScreenProps> = ({ onToast }) => {
  const { 
    state, 
    dayDiff, 
    dateLabel, 
    can, 
    submitDocumentRenewal, 
    verifyDocumentRenewal,
    refreshBackend 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedValidity, setSelectedValidity] = useState('');

  // Modals state
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [renewalDocRef, setRenewalDocRef] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Verification modal state
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyOutcome, setVerifyOutcome] = useState<boolean>(true);

  // In-Browser Document Preview Modal
  const [viewerDoc, setViewerDoc] = useState<DocumentRecord | null>(null);

  const getValidityKind = (expiryDate: string): 'Expired' | 'Expires soon' | 'Valid' => {
    const diff = dayDiff(expiryDate);
    if (diff === null) return 'Valid';
    if (diff < 0) return 'Expired';
    if (diff <= state.settings.expiryDays) return 'Expires soon';
    return 'Valid';
  };

  const filteredDocs = useMemo(() => {
    return state.docs.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || d.title.toLowerCase().includes(q) || d.institution.toLowerCase().includes(q);
      const validity = getValidityKind(d.expiryDate);
      const matchesValidity = !selectedValidity || validity === selectedValidity;
      return matchesSearch && matchesValidity;
    });
  }, [state.docs, searchQuery, selectedValidity, state.simDate, state.settings.expiryDays]);

  const handleOpenSubmit = (doc: DocumentRecord) => {
    setSelectedDoc(doc);
    setRenewalDocRef(`RNW-${doc.id}-${new Date().getFullYear()}`);
    setSelectedFile(null);
    setIsSubmitModalOpen(true);
  };

  const handleOpenVerify = (doc: DocumentRecord) => {
    setSelectedDoc(doc);
    setIsVerifyModalOpen(true);
  };

  const handleOpenPreview = (doc: DocumentRecord) => {
    setViewerDoc(doc);
  };

  const handleSubmitRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    setUploading(true);
    try {
      if (selectedFile) {
        // Upload real binary with SHA-256 integrity checks
        const result = await api.uploadDocumentBinary(selectedDoc.id, selectedFile);
        if (refreshBackend) await refreshBackend();
        onToast(
          `Document "${result.fileName}" uploaded. SHA-256: ${result.checksumSha256.slice(0, 8)}… Verification pending.`,
          'success'
        );
      } else {
        // Text-only reference submission
        submitDocumentRenewal(selectedDoc.id);
        onToast(`Renewal submission recorded for "${selectedDoc.title}". Official verification pending.`, 'success');
      }
      setIsSubmitModalOpen(false);
    } catch (err: any) {
      onToast(err.message || 'Failed to upload document binary.', 'warning');
    } finally {
      setUploading(false);
    }
  };

  const handleVerifyRenewal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    verifyDocumentRenewal(selectedDoc.id, verifyOutcome);
    const msg = verifyOutcome 
      ? `Renewal verified for "${selectedDoc.title}". Expiration date extended.`
      : `Renewal rejected for "${selectedDoc.title}". Resubmission required.`;
    onToast(msg, verifyOutcome ? 'success' : 'warning');
    setIsVerifyModalOpen(false);
  };

  const renderDueBadge = (dateStr: string | null | undefined) => {
    const diff = dayDiff(dateStr);
    if (diff === null) return <StatusBadge status="No deadline" kind="muted" />;
    if (diff < 0) return <StatusBadge status={`${Math.abs(diff)}d expired`} kind="red" />;
    if (diff === 0) return <StatusBadge status="Expires today" kind="amber" />;
    if (diff <= state.settings.expiryDays) return <StatusBadge status={`${diff}d left`} kind="amber" />;
    return <StatusBadge status="Valid" kind="green" />;
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Institutional document register</div>
          <h1>Documents &amp; validity</h1>
          <p>
            Continuous validity tracking for mandatory safety certificates, land deeds, and society registration papers. Expiry warnings generate automated reminders with cryptographic SHA-256 verification.
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
              placeholder="Search by document title or institution..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 36, width: '100%' }}
            />
          </div>

          <div style={{ width: 180 }}>
            <select
              value={selectedValidity}
              onChange={(e) => setSelectedValidity(e.target.value)}
            >
              <option value="">All validity states</option>
              <option value="Valid">Valid</option>
              <option value="Expires soon">Expires soon</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Documents Table */}
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Document title</th>
                <th>Institution</th>
                <th>Expiry date</th>
                <th>Validity state</th>
                <th>Renewal filing</th>
                <th>Review status</th>
                <th>Document File</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc) => {
                const validity = getValidityKind(doc.expiryDate);
                const hasFile = Boolean(doc.fileName || doc.renewalStatus !== 'Not submitted');

                return (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-white)' }}>
                          {doc.title}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                          ID: {doc.id}
                        </span>
                      </div>
                    </td>
                    <td>{doc.institution}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span>{dateLabel(doc.expiryDate)}</span>
                        {renderDueBadge(doc.expiryDate)}
                      </div>
                    </td>
                    <td>
                      <StatusBadge 
                        status={validity} 
                        kind={validity === 'Expired' ? 'red' : validity === 'Expires soon' ? 'amber' : 'green'} 
                      />
                    </td>
                    <td>
                      <StatusBadge 
                        status={doc.renewalStatus} 
                        kind={doc.renewalStatus === 'Verified' ? 'green' : doc.renewalStatus === 'Submitted' ? 'lime' : 'muted'} 
                      />
                    </td>
                    <td>
                      <StatusBadge status={doc.reviewStatus} />
                    </td>
                    <td>
                      {hasFile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => handleOpenPreview(doc)}
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
                            title="Preview PDF/image binary in browser"
                          >
                            <Eye size={12} />
                            <span>Preview</span>
                          </button>
                          {doc.checksumSha256 && (
                            <span
                              style={{
                                fontSize: 10,
                                fontFamily: 'var(--font-mono)',
                                color: 'var(--text-faint)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                              title={`SHA-256: ${doc.checksumSha256}`}
                            >
                              <Lock size={9} /> {doc.checksumSha256.slice(0, 8)}…
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>No binary</span>
                      )}
                    </td>
                    <td>
                      {doc.renewalStatus === 'Not submitted' ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleOpenSubmit(doc)}
                          disabled={!can('submitRenewal')}
                          title={can('submitRenewal') ? 'Submit renewed certificate binary' : 'Requires Institution User role'}
                        >
                          <Upload size={13} /> Upload renewal
                        </button>
                      ) : doc.reviewStatus === 'Pending Verification' ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleOpenVerify(doc)}
                          disabled={!can('verifyRenewal')}
                          title={can('verifyRenewal') ? 'Review submitted renewal' : 'Requires Regional Officer or Competent Authority'}
                        >
                          <ShieldCheck size={13} /> Verify renewal
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
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-state">
                    No documents matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {/* Submit Renewal Modal with Drag-and-Drop Binary Upload */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title={`Upload Renewal Document: ${selectedDoc?.title}`}
        description="Submit official renewed document binary (PDF/JPEG/PNG, max 10MB). SHA-256 checksum will be cryptographically anchored for regulatory auditing."
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
              onClick={handleSubmitRenewal}
              disabled={uploading}
            >
              {uploading ? 'Securing & Uploading…' : 'Submit & Sign Record'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitRenewal} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* File Upload Dropzone */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)' }}>
              Document Binary File (PDF, JPEG, or PNG) *
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
              Renewal Certificate Document Number / Reference
            </label>
            <input
              type="text"
              value={renewalDocRef}
              onChange={(e) => setRenewalDocRef(e.target.value)}
              placeholder="e.g. NOC-FIRE-2026-MUM-8921"
            />
          </div>

          <div style={{ fontSize: 11.5, color: 'var(--text-faint)', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: 6 }}>
            <strong>Cryptographic Guarantee:</strong> Upon upload, a SHA-256 checksum is computed on the binary stream to ensure tampering prevention across scrutiny inspections.
          </div>
        </form>
      </Modal>

      {/* Verify Renewal Modal with Live Document Preview */}
      <Modal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        title={`Verify Document Renewal: ${selectedDoc?.title}`}
        description="Statutory authenticity review of renewed institutional safety/registration certificate."
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
              onClick={handleVerifyRenewal}
            >
              Confirm Determination
            </button>
          </>
        }
      >
        <form onSubmit={handleVerifyRenewal} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick preview trigger in verification modal */}
          {selectedDoc && (
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
                    {selectedDoc.fileName || `${selectedDoc.title}.pdf`}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                    {selectedDoc.checksumSha256 ? `SHA-256: ${selectedDoc.checksumSha256.slice(0, 16)}…` : 'Awaiting verification'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setViewerDoc(selectedDoc)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Eye size={13} /> View Binary
              </button>
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)', display: 'block', marginBottom: 8 }}>
              Renewal Determination *
            </label>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text-white)' }}>
                <input
                  type="radio"
                  name="verifyOutcome"
                  value="true"
                  checked={verifyOutcome === true}
                  onChange={() => setVerifyOutcome(true)}
                />
                Accept &amp; Extend Validity (2027)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text-white)' }}>
                <input
                  type="radio"
                  name="verifyOutcome"
                  value="false"
                  checked={verifyOutcome === false}
                  onChange={() => setVerifyOutcome(false)}
                />
                Reject Renewal
              </label>
            </div>
          </div>
        </form>
      </Modal>

      {/* In-Browser Document Preview Modal */}
      {viewerDoc && (
        <DocumentViewerModal
          isOpen={Boolean(viewerDoc)}
          onClose={() => setViewerDoc(null)}
          title={viewerDoc.title}
          documentId={viewerDoc.id}
          endpoint={`/api/v1/documents/${viewerDoc.id}/file`}
          fileName={viewerDoc.fileName || `${viewerDoc.title.replace(/\s+/g, '_')}.pdf`}
          fileSize={viewerDoc.fileSize}
          mimeType={viewerDoc.mimeType || 'application/pdf'}
          checksumSha256={viewerDoc.checksumSha256}
          uploadedAt={viewerDoc.uploadedAt}
        />
      )}
    </div>
  );
};
