import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { ScreenType } from '../types/index';
import type { Application } from '../types/domain';
import { GlassPanel } from '../components/GlassPanel';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  FastForward, 
  FileCheck2, 
  ShieldAlert, 
  Search, 
  Filter,
  Eye,
  FileText,
  BadgeAlert
} from 'lucide-react';

interface RegionalDeskScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

const REGIONAL_ELIGIBLE_STAGES = ['EVC Report Review', 'Initial Scrutiny', 'SAC/SHC Review'];

export const RegionalDeskScreen: React.FC<RegionalDeskScreenProps> = ({ onNavigate, onToast }) => {
  const { 
    state, 
    dateLabel, 
    dayDiff,
    can, 
    regionalReview, 
    setSelectedAppId 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [recommendation, setRecommendation] = useState<'Endorse' | 'Escalate' | 'Return'>('Endorse');
  const [remarks, setRemarks] = useState('');
  const [selectedComplianceIds, setSelectedComplianceIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter applications eligible for regional office review
  const eligibleApps = useMemo(() => {
    return state.apps.filter((a) => {
      const isEligibleStage = REGIONAL_ELIGIBLE_STAGES.includes(a.stage);
      if (!isEligibleStage) return false;

      if (stageFilter !== 'all' && a.stage !== stageFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = a.id.toLowerCase().includes(q);
        const matchesInst = a.institution.toLowerCase().includes(q);
        const matchesRegion = a.region.toLowerCase().includes(q);
        return matchesId || matchesInst || matchesRegion;
      }

      return true;
    });
  }, [state.apps, stageFilter, searchQuery]);

  // Metric counts
  const totalEligible = useMemo(() => {
    return state.apps.filter((a) => REGIONAL_ELIGIBLE_STAGES.includes(a.stage)).length;
  }, [state.apps]);

  const evcReviewCount = useMemo(() => {
    return state.apps.filter((a) => a.stage === 'EVC Report Review').length;
  }, [state.apps]);

  const actionRequiredCount = useMemo(() => {
    return state.apps.filter((a) => a.status === 'Action required' || a.stage === 'Institution Response').length;
  }, [state.apps]);

  const regionalEndorsementsCount = useMemo(() => {
    return state.audit.filter((e) => e.rule === 'REG-01').length;
  }, [state.audit]);

  // Compliance obligations for the application currently being reviewed
  const appCompliance = useMemo(() => {
    if (!selectedApp) return [];
    return state.compliance.filter((c) => c.appId === selectedApp.id);
  }, [selectedApp, state.compliance]);

  const handleOpenReview = (app: Application) => {
    setSelectedApp(app);
    setRecommendation('Endorse');
    setRemarks('');
    setSelectedComplianceIds(
      state.compliance
        .filter((c) => c.appId === app.id && c.verification !== 'Verified')
        .map((c) => c.id)
    );
    setIsReviewModalOpen(true);
  };

  const handleToggleCompliance = (id: string) => {
    setSelectedComplianceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmitReview = async () => {
    if (!selectedApp) return;

    if (!remarks.trim()) {
      onToast('Substantive review remarks are mandatory per APH 2026-27 norms.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await regionalReview(
        selectedApp.id,
        recommendation,
        remarks.trim(),
        selectedComplianceIds
      );

      if (res.ok) {
        const actionLabel =
          recommendation === 'Endorse'
            ? 'endorsed and advanced'
            : recommendation === 'Escalate'
            ? 'fast-tracked to Competent Authority'
            : 'returned to Institution with deficiency notice';
        onToast(`Application ${selectedApp.id} successfully ${actionLabel}!`, 'success');
        setIsReviewModalOpen(false);
        setSelectedApp(null);
      } else {
        onToast(res.reason || 'Regional review failed.', 'warning');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCaseDetail = (appId: string) => {
    setSelectedAppId(appId);
    onNavigate('case');
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="page-eyebrow">Regional Office Operations</div>
          <h1>Regional Desk</h1>
          <p>Regional dossier inspection, compliance verification, and statutory recommendations.</p>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <MetricCard
          label="Awaiting Regional Review"
          value={totalEligible}
          icon={<Building2 size={20} color="var(--brand-accent)" />}
          subtitle="Dossiers in Scrutiny or Post-EVC"
          accent="amber"
        />
        <MetricCard
          label="EVC Reports for Review"
          value={evcReviewCount}
          icon={<FileCheck2 size={20} color="var(--accent-blue, #3b82f6)" />}
          subtitle="Committee findings recorded"
          accent="blue"
        />
        <MetricCard
          label="Deficiencies / Returns"
          value={actionRequiredCount}
          icon={<ShieldAlert size={20} color="var(--accent-crimson)" />}
          subtitle="Institution response awaited"
          accent="red"
        />
        <MetricCard
          label="Regional Determinations"
          value={regionalEndorsementsCount}
          icon={<CheckCircle2 size={20} color="var(--accent-lime)" />}
          subtitle="Stamped under Rule REG-01"
          accent="green"
        />
      </div>

      {/* Main Review Desk Glass Panel */}
      <GlassPanel
        title="Regional Office Scrutiny & Endorsement Desk"
        subtitle="Review institutional dossiers, verify statutory compliance obligations, and record regional recommendations under APH 2026-27."
        action={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', minWidth: 220 }}>
              <Search
                size={14}
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                placeholder="Search by ID, institute, region..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '6px 10px 6px 30px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--text-primary)',
                  fontSize: 12.5,
                  width: '100%',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter size={14} color="var(--text-muted)" />
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card, #1e293b)',
                  color: 'var(--text-primary)',
                  fontSize: 12.5,
                }}
              >
                <option value="all">All Eligible Stages</option>
                <option value="Initial Scrutiny">Initial Scrutiny</option>
                <option value="EVC Report Review">EVC Report Review</option>
                <option value="SAC/SHC Review">SAC/SHC Review</option>
              </select>
            </div>
          </div>
        }
      >
        {eligibleApps.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ opacity: 0.4, margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
              No applications currently awaiting regional review
            </div>
            <p style={{ fontSize: 13, marginTop: 4 }}>
              All dossiers in Initial Scrutiny, EVC Report Review, or SAC/SHC Review have been endorsed or advanced.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 12px' }}>Application ID</th>
                  <th style={{ padding: '10px 12px' }}>Institution & Region</th>
                  <th style={{ padding: '10px 12px' }}>Route</th>
                  <th style={{ padding: '10px 12px' }}>Current Stage</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px' }}>Due Date</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {eligibleApps.map((app) => {
                  const diff = dayDiff(app.dueDate);
                  return (
                    <tr
                      key={app.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '12px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenCaseDetail(app.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--brand-accent)',
                            cursor: 'pointer',
                            fontWeight: 700,
                            padding: 0,
                            textDecoration: 'underline',
                          }}
                        >
                          {app.id}
                        </button>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{app.institution}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{app.region} Region · {app.type}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {app.route}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <StatusBadge
                          status={app.stage}
                          kind={
                            app.stage === 'EVC Report Review'
                              ? 'blue'
                              : app.stage === 'Initial Scrutiny'
                              ? 'amber'
                              : 'purple'
                          }
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <StatusBadge
                          status={app.status}
                          kind={
                            app.status === 'In progress'
                              ? 'green'
                              : app.status === 'Action required'
                              ? 'red'
                              : 'muted'
                          }
                        />
                      </td>
                      <td style={{ padding: '12px', fontSize: 12 }}>
                        <div>{dateLabel(app.dueDate)}</div>
                        {diff !== null && (
                          <div style={{ fontSize: 10.5, color: diff < 0 ? 'var(--accent-crimson)' : 'var(--text-muted)' }}>
                            {diff < 0 ? `${Math.abs(diff)}d overdue` : `${diff}d left`}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => handleOpenCaseDetail(app.id)}
                            title="Inspect full electronic case dossier"
                          >
                            <Eye size={13} />
                            <span>Dossier</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => handleOpenReview(app)}
                            disabled={!can('regionalReview')}
                            title={
                              !can('regionalReview')
                                ? `Current role (${state.role}) cannot record regional endorsements.`
                                : 'Record Regional Office scrutiny determination'
                            }
                          >
                            <FileCheck2 size={13} />
                            <span>Review & Endorse</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>

      {/* Regional Review & Endorsement Modal */}
      {selectedApp && (
        <Modal
          isOpen={isReviewModalOpen}
          onClose={() => !isSubmitting && setIsReviewModalOpen(false)}
          title={`Regional Office Scrutiny & Determination — ${selectedApp.id}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Institution Header Card */}
            <div
              style={{
                padding: 14,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
                fontSize: 12.5,
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Institution:</span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedApp.institution}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Region & Route:</span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedApp.region} · {selectedApp.route}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Current Stage:</span>
                <div style={{ marginTop: 2 }}>
                  <StatusBadge status={selectedApp.stage} kind="amber" />
                </div>
              </div>
            </div>

            {/* Recommendation Selector */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--text-primary)' }}>
                Regional Office Recommendation:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setRecommendation('Endorse')}
                  style={{
                    padding: 12,
                    borderRadius: 'var(--radius-md)',
                    border: recommendation === 'Endorse' ? '2px solid var(--accent-lime)' : '1px solid var(--border-subtle)',
                    background: recommendation === 'Endorse' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--accent-lime)' }}>
                    <CheckCircle2 size={16} />
                    <span>Endorse</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Advance dossier along standard route to SAC/SHC or Decision Pending.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRecommendation('Escalate')}
                  style={{
                    padding: 12,
                    borderRadius: 'var(--radius-md)',
                    border: recommendation === 'Escalate' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    background: recommendation === 'Escalate' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    <FastForward size={16} />
                    <span>Escalate</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Fast-track directly to Competent Authority for priority determination.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRecommendation('Return')}
                  style={{
                    padding: 12,
                    borderRadius: 'var(--radius-md)',
                    border: recommendation === 'Return' ? '2px solid var(--accent-crimson)' : '1px solid var(--border-subtle)',
                    background: recommendation === 'Return' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--accent-crimson)' }}>
                    <AlertTriangle size={16} />
                    <span>Return</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Return to Institution with statutory deficiency grounds under WF-02.
                  </div>
                </button>
              </div>
            </div>

            {/* Compliance Obligations Checklist */}
            {appCompliance.length > 0 && recommendation !== 'Return' && (
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6, color: 'var(--text-primary)' }}>
                  Verify Associated Compliance Obligations:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                  {appCompliance.map((cmp) => {
                    const isChecked = selectedComplianceIds.includes(cmp.id);
                    return (
                      <label
                        key={cmp.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          background: isChecked ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCompliance(cmp.id)}
                          style={{ cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cmp.id}: </span>
                          <span>{cmp.title}</span>
                          <span style={{ marginLeft: 8 }}>
                            <StatusBadge
                              status={cmp.verification}
                              kind={cmp.verification === 'Verified' ? 'green' : 'amber'}
                            />
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Substantive Regional Remarks */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6, color: 'var(--text-primary)' }}>
                Regional Officer Findings & Remarks <span style={{ color: 'var(--accent-crimson)' }}>*</span>:
              </label>
              <textarea
                rows={4}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter substantive observations per AICTE APH 2026-27 norms (e.g. land title verification, infrastructural norms, faculty cadre ratio, on-site EVC report review findings)..."
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: 'var(--text-primary)',
                  fontSize: 12.5,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Audit Notice */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(0, 53, 128, 0.08)',
                border: '1px solid var(--border-subtle)',
                fontSize: 11.5,
                color: 'var(--text-muted)',
              }}
            >
              <BadgeAlert size={15} color="var(--brand-accent)" />
              <span>
                Submission will be permanently recorded in the immutable audit ledger with rule <strong>REG-01</strong> and stamped with a unique correlation token.
              </span>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setIsReviewModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${recommendation === 'Return' ? 'btn-danger' : 'btn-primary'}`}
                onClick={handleSubmitReview}
                disabled={isSubmitting || !remarks.trim()}
              >
                {isSubmitting
                  ? 'Submitting…'
                  : recommendation === 'Endorse'
                  ? 'Confirm Endorsement →'
                  : recommendation === 'Escalate'
                  ? 'Escalate to Authority →'
                  : 'Return for Deficiency →'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
