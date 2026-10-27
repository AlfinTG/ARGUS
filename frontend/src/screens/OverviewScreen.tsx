import React from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import type { ScreenType } from '../types/index';
import { StatusBadge } from '../components/StatusBadge';
import { Play, RotateCcw, Info, ArrowRight } from 'lucide-react';

interface OverviewScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const OverviewScreen: React.FC<OverviewScreenProps> = ({ onNavigate, onToast }) => {
  const {
    state,
    dayDiff,
    dateLabel,
    runAutomationCycle,
    resetDemo,
    setSelectedAppId
  } = useApp();
  const { t } = useLanguage();

  // ── Metrics ──────────────────────────────────────────────────────────
  const openApps = state.apps.filter((a) => !['Closed', 'Rejected'].includes(a.status));

  const overdueApps = state.apps.filter(
    (a) => a.dueDate && (dayDiff(a.dueDate) ?? 0) < 0 && !['Closed', 'Rejected'].includes(a.status)
  ).length;
  const overdueCompliance = state.compliance.filter(
    (c) => c.verification !== 'Verified' && (dayDiff(c.dueDate) ?? 0) < 0
  ).length;
  const overdueDocs = state.docs.filter(
    (d) => d.reviewStatus !== 'Verified' && (dayDiff(d.expiryDate) ?? 0) < 0
  ).length;
  const totalOverdue = overdueApps + overdueCompliance + overdueDocs;

  const dueSoonCompliance = state.compliance.filter((c) => {
    if (c.verification === 'Verified') return false;
    const diff = dayDiff(c.dueDate);
    return diff !== null && diff >= 0 && diff <= state.settings.reminderDays;
  }).length;
  const dueSoonDocs = state.docs.filter((d) => {
    if (d.reviewStatus === 'Verified') return false;
    const diff = dayDiff(d.expiryDate);
    return diff !== null && diff >= 0 && diff <= state.settings.expiryDays;
  }).length;
  const totalDueSoon = dueSoonCompliance + dueSoonDocs;

  const openEvc = state.evcs.filter((e) => e.status !== 'Completed');

  // Sorted by urgency: overdue first, then by days remaining
  const sortedApps = [...state.apps]
    .filter((a) => !['Closed', 'Rejected'].includes(a.status))
    .sort((a, b) => (dayDiff(a.dueDate) ?? 999) - (dayDiff(b.dueDate) ?? 999))
    .slice(0, 5);

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleOpenCase = (appId: string) => {
    setSelectedAppId(appId);
    onNavigate('case');
  };

  const handleRunCycle = () => {
    const result = runAutomationCycle();
    onToast(result.message, result.newAlertsCount > 0 ? 'warning' : 'info');
  };

  const handleReset = () => {
    if (window.confirm('Reset demo state back to factory synthetic dataset?')) {
      resetDemo();
      onToast('Demo state successfully reset to initial baseline.', 'info');
    }
  };

  const renderDueBadge = (dateStr: string | null | undefined) => {
    const diff = dayDiff(dateStr);
    if (diff === null) return <StatusBadge status="No deadline" kind="muted" />;
    if (diff < 0)  return <StatusBadge status={`${Math.abs(diff)}d overdue`} kind="red" />;
    if (diff === 0) return <StatusBadge status="Due today" kind="amber" />;
    if (diff <= state.settings.reminderDays) return <StatusBadge status={`Due in ${diff} days`} kind="amber" />;
    return <StatusBadge status="On track" kind="green" />;
  };

  // Most recent audit entry for the stream panel summary
  const latestAudit = state.audit[0];

  return (
    <div className="animate-fade-in">
      {/* Page-level actions — rendered here so they sit inside the h1 row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: -52, marginBottom: 24 }}>
        <button
          type="button"
          className="btn"
          onClick={handleReset}
          title="Reset to factory synthetic dataset"
          id="overview-reset-btn"
        >
          <RotateCcw size={14} />
          {t('resetDemoBtn')}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleRunCycle}
          title="Trigger automated due-date and expiry rule evaluation"
          id="overview-run-cycle-btn"
        >
          <Play size={14} />
          {t('runCycleBtn')}
        </button>
      </div>

      {/* ── KPI Metric Cards ─────────────────────────────────────────── */}
      <div className="metrics-grid">
        <div
          className="metric-card"
          onClick={() => onNavigate('applications')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('applications')}
          aria-label={`${openApps.length} open applications`}
          title="View all open applications"
        >
          <div className="metric-head">{t('kpiOpenApps')}</div>
          <div className="metric-value">{openApps.length}</div>
          <div className="metric-sub">{t('kpiOpenAppsSub')}</div>
        </div>

        <div
          className={`metric-card ${totalOverdue > 0 ? 'alert' : ''}`}
          onClick={() => onNavigate('alerts')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('alerts')}
          aria-label={`${totalOverdue} overdue items`}
          title="View overdue alerts"
        >
          <div className="metric-head">{t('kpiOverdue')}</div>
          <div className="metric-value">{totalOverdue}</div>
          <div className="metric-sub">{t('kpiOverdueSub')}</div>
        </div>

        <div
          className="metric-card"
          onClick={() => onNavigate('compliance')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('compliance')}
          aria-label={`${totalDueSoon} items due or expiring soon`}
          title="View compliance obligations"
        >
          <div className="metric-head">{t('kpiDueSoon')}</div>
          <div className="metric-value">{totalDueSoon}</div>
          <div className="metric-sub">{t('kpiDueSoonSub')}</div>
        </div>

        <div
          className="metric-card"
          onClick={() => onNavigate('evc')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('evc')}
          aria-label={`${openEvc.length} open EVC tasks`}
          title="View EVC desk"
        >
          <div className="metric-head">{t('kpiEvc')}</div>
          <div className="metric-value">{openEvc.length}</div>
          <div className="metric-sub">{t('kpiEvcSub')}</div>
        </div>
      </div>

      {/* ── Main 2-Column Grid ────────────────────────────────────────── */}
      <div className="grid-2-cols">
        {/* Left: Action Required Table */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">{t('actionRequiredTitle')}</div>
              <div className="panel-subtitle">{t('actionRequiredSubtitle')}</div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onNavigate('applications')}
              id="overview-view-all-apps-btn"
            >
              {t('viewAllApps')} ({openApps.length}) <ArrowRight size={12} />
            </button>
          </div>
          <div className="data-table-container">
            <table className="data-table" aria-label="Applications requiring action">
              <thead>
                <tr>
                  <th>{t('colApplication')}</th>
                  <th>{t('colInstitution')}</th>
                  <th>{t('colCurrentStage')}</th>
                  <th>{t('colOwner')}</th>
                  <th>{t('colDeadline')}</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedApps.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <span
                        className="table-id-link"
                        onClick={() => handleOpenCase(app.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleOpenCase(app.id)}
                        aria-label={`Open case ${app.id}`}
                      >
                        {app.id}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{app.institution}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{app.stage}</span>
                      <span className="table-subtext">{app.route}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{app.ownerRole}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {dateLabel(app.dueDate)}
                    </td>
                    <td>{renderDueBadge(app.dueDate)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleOpenCase(app.id)}
                        aria-label={`Open case ${app.id}`}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
                {sortedApps.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty-state">No active applications requiring attention.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Automation & Audit Stream */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">{t('streamTitle')}</div>
              <div className="panel-subtitle">{t('streamSubtitle')}</div>
            </div>
          </div>
          <div style={{ padding: '0 20px 16px' }}>
            {/* Latest automation summary */}
            {latestAudit && (
              <div
                style={{
                  background: '#f0f7ff',
                  border: '1px solid var(--blue-border)',
                  borderLeft: '3px solid var(--brand-accent)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  marginBottom: 14,
                  fontSize: 12.5,
                  color: 'var(--text-primary)',
                  lineHeight: 1.5,
                }}
              >
                <strong>Rule evaluation cycle run</strong> as of {state.simDate}. Scanned {state.apps.length} cases,{' '}
                {state.compliance.length} obligations, {state.docs.length} documents. New alerts:{' '}
                {state.alerts.filter((a) => a.status === 'Open').length}. Skipped duplicates:{' '}
                {state.audit.filter((e) => e.type === 'Automation').length}.
                <div style={{ marginTop: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                  {latestAudit.time} · {latestAudit.actor}
                </div>
              </div>
            )}

            {/* Audit entries */}
            <div className="activity-stream">
              {state.audit.slice(0, 4).map((entry) => (
                <div key={entry.id} className="activity-item">
                  <div className="activity-icon-badge">
                    {entry.type === 'Automation' ? '↻' : entry.type === 'Workflow' ? '→' : '•'}
                  </div>
                  <div className="activity-content">
                    <div className="activity-detail">{entry.detail}</div>
                    <div className="activity-meta">
                      <span>{entry.time}</span>
                      <span>·</span>
                      <span>{entry.actor}</span>
                      {entry.rule && (
                        <>
                          <span>·</span>
                          <span className="code-tag">{entry.rule}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {state.audit.length === 0 && (
                <div className="empty-state">No audit events logged yet.</div>
              )}
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onNavigate('audit')}
              style={{ marginTop: 12 }}
              id="overview-open-audit-btn"
            >
              Open full audit log <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Secondary 3-Column Grid ───────────────────────────────────── */}
      <div className="grid-3-cols">
        {/* EVC Queue */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">EVC desk</div>
              <div className="panel-subtitle">Eligible committee queues</div>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate('evc')}>
              Open desk <ArrowRight size={12} />
            </button>
          </div>
          <div style={{ padding: '0 20px 16px' }}>
            <div className="queue-list">
              {openEvc.slice(0, 3).map((e) => (
                <div key={e.id} className="queue-item">
                  <div className="queue-item-info">
                    <div className="queue-item-title">{e.appId} · {e.institution}</div>
                    <div className="queue-item-sub">
                      {e.visitDate ? `Visit: ${dateLabel(e.visitDate)}` : 'Needs scheduling'}
                    </div>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
              ))}
              {openEvc.length === 0 && <div className="empty-state">No open EVC tasks.</div>}
            </div>
          </div>
        </div>

        {/* Compliance Due */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Compliance due</div>
              <div className="panel-subtitle">Statutory undertakings</div>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate('compliance')}>
              Review <ArrowRight size={12} />
            </button>
          </div>
          <div style={{ padding: '0 20px 16px' }}>
            <div className="queue-list">
              {state.compliance
                .filter((c) => c.verification !== 'Verified')
                .slice(0, 3)
                .map((c) => (
                  <div key={c.id} className="queue-item">
                    <div className="queue-item-info">
                      <div className="queue-item-title">{c.title}</div>
                      <div className="queue-item-sub">{c.institution}</div>
                    </div>
                    {renderDueBadge(c.dueDate)}
                  </div>
                ))}
              {state.compliance.filter((c) => c.verification !== 'Verified').length === 0 && (
                <div className="empty-state">All obligations verified.</div>
              )}
            </div>
          </div>
        </div>

        {/* Document Validity */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Document validity</div>
              <div className="panel-subtitle">Safety &amp; lease registrations</div>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate('documents')}>
              Review <ArrowRight size={12} />
            </button>
          </div>
          <div style={{ padding: '0 20px 16px' }}>
            <div className="queue-list">
              {state.docs
                .filter((d) => d.reviewStatus !== 'Verified')
                .slice(0, 3)
                .map((d) => (
                  <div key={d.id} className="queue-item">
                    <div className="queue-item-info">
                      <div className="queue-item-title">{d.title}</div>
                      <div className="queue-item-sub">{d.institution}</div>
                    </div>
                    {renderDueBadge(d.expiryDate)}
                  </div>
                ))}
              {state.docs.filter((d) => d.reviewStatus !== 'Verified').length === 0 && (
                <div className="empty-state">All documents verified.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Idempotency note */}
      <div className="notice-box notice-info" style={{ marginBottom: 20 }}>
        <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong>Idempotency protected:</strong> Re-running the automation cycle without date progression
          will not generate duplicate alerts or side-effects.
        </div>
      </div>
    </div>
  );
};
