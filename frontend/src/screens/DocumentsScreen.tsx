import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { ScreenType } from '../types/index';
import type { DocumentRecord } from '../types/domain';
import { GlassPanel } from '../components/GlassPanel';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Search, Upload, ShieldCheck, CheckCircle2 } from 'lucide-react';

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
    verifyDocumentRenewal 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedValidity, setSelectedValidity] = useState('');

  // Modals state
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [renewalDocRef, setRenewalDocRef] = useState('');

  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyOutcome, setVerifyOutcome] = useState<boolean>(true);

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
    setIsSubmitModalOpen(true);
  };

  const handleOpenVerify = (doc: DocumentRecord) => {
    setSelectedDoc(doc);
    setIsVerifyModalOpen(true);
  };

  const handleSubmitRenewal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    submitDocumentRenewal(selectedDoc.id);
    onToast(`Renewal submission uploaded for "${selectedDoc.title}". Official verification pending.`, 'success');
    setIsSubmitModalOpen(false);
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
          <h1>Documents & validity</h1>
          <p>
            Continuous validity tracking for mandatory safety certificates, land deeds, and society registration papers. Expiry warnings generate automated reminders.
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

          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={selectedValidity}
              onChange={(e) => setSelectedValidity(e.target.value)}
              aria-label="Filter by validity state"
            >
              <option value="">All validity states</option>
              <option value="Expired">Expired</option>
              <option value="Expires soon">Expires soon</option>
              <option value="Valid">Valid</option>
            </select>

            {(searchQuery || selectedValidity) && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedValidity('');
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Documents Table */}
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Institution</th>
                <th>Recorded expiry</th>
                <th>Validity state</th>
                <th>Renewal filing</th>
                <th>Review status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc) => {
                const validity = getValidityKind(doc.expiryDate);
                return (
                  <tr key={doc.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text-white)' }}>
                        {doc.title}
                      </span>
                      <span className="table-subtext">{doc.id}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{doc.institution}</span>
                      <span className="table-subtext">Owner: {doc.ownerRole}</span>
                    </td>
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
                      {doc.renewalStatus === 'Not submitted' ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleOpenSubmit(doc)}
                          disabled={!can('submitRenewal')}
                          title={can('submitRenewal') ? 'Submit renewed certificate' : 'Requires Institution User role'}
                        >
                          <Upload size={13} /> Submit renewal
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
                  <td colSpan={7} className="empty-state">
                    No documents matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {/* Submit Renewal Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title={`Submit Renewal Certificate: ${selectedDoc?.title}`}
        description="Provide renewed certificate registration reference. Verification remains pending by statutory officials."
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
              onClick={handleSubmitRenewal}
            >
              Submit Renewal
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitRenewal} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)' }}>
              Renewal Certificate Document Number *
            </label>
            <input
              type="text"
              value={renewalDocRef}
              onChange={(e) => setRenewalDocRef(e.target.value)}
              placeholder="e.g. NOC-FIRE-2026-MUM-8921"
              required
            />
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
            Uploading renewal proof updates filing status to <strong>Pending Verification</strong>.
          </div>
        </form>
      </Modal>

      {/* Verify Renewal Modal */}
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
        <form onSubmit={handleVerifyRenewal} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                Accept & Extend Validity (2027)
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
    </div>
  );
};
