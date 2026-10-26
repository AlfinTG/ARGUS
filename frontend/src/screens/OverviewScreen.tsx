import React from 'react';
import { useApp } from '../context/AppContext';
import type { ScreenType } from '../types/index';
import { MetricCard } from '../components/MetricCard';
import { GlassPanel } from '../components/GlassPanel';
import { StatusBadge } from '../components/StatusBadge';
import { 
  FileText, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Play, 
  RotateCcw, 
  ArrowRight, 
  Info
} from 'lucide-react';

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

  // Metrics computation
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

  // Sorted applications requiring attention (by urgency/due date)
  const sortedApps = [...state.apps]
    .filter((a) => !['Closed', 'Rejected'].includes(a.status))
    .sort((a, b) => (dayDiff(a.dueDate) ?? 999) - (dayDiff(b.dueDate) ?? 999))
    .slice(0, 5);

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
    if (diff < 0) return <StatusBadge status={`${Math.abs(diff)}d overdue`} kind="red" />;
    if (diff === 0) return <StatusBadge status="Due today" kind="amber" />;
    if (diff <= state.settings.reminderDays) return <StatusBadge status={`${diff}d left`} kind="amber" />;
    return <StatusBadge status="On track" kind="green" />;
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Control room · {state.simDate} simulation date</div>
          <h1>Approval operations</h1>
          <p>
            Holistic view of all pending regulatory stages, statutory deadline risks, EVC queues, and rule-driven escalations.
          </p>
        </div>
        <div className="page-actions">
          <button 
            type="button" 
            className="btn btn-ghost"
            onClick={handleReset}
            title="Reset to factory synthetic dataset"
          >
            <RotateCcw size={15} /> Reset demo
          </button>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={handleRunCycle}
            title="Trigger automated due-date and expiry rule evaluation"
          >
            <Play size={15} /> Run automation cycle
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="metrics-grid">
        <MetricCard
          label="Open applications"
          value={openApps.length}
          subtitle="Across configured routes"
          icon={<FileText size={18} />}
          onClick={() => onNavigate('applications')}
        />
        <MetricCard
          label="Overdue items"
          value={totalOverdue}
          subtitle="Cases + compliance + documents"
          icon={<AlertTriangle size={18} />}
          onClick={() => onNavigate('alerts')}
        />
        <MetricCard
          label="Due / expiry watch"
          value={totalDueSoon}
          subtitle={`Within active window (${state.settings.reminderDays}d / ${state.settings.expiryDays}d)`}
          icon={<Clock size={18} />}
          onClick={() => onNavigate('compliance')}
        />
        <MetricCard
          label="Open EVC tasks"
          value={openEvc.length}
          subtitle="Scheduling or report review"
          icon={<ShieldCheck size={18} />}
          onClick={() => onNavigate('evc')}
        />
      </div>

      {/* Primary 2-Column Grid */}
      <div className="grid-2-cols">
        {/* Applications Requiring Attention */}
        <GlassPanel
          title="Applications requiring attention"
          subtitle="Prioritized by statutory deadline and stage state"
          action={
            <button 
              type="button" 
              className="btn btn-sm btn-ghost" 
              onClick={() => onNavigate('applications')}
            >
              View all ({openApps.length}) <ArrowRight size={13} />
            </button>
          }
        >
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Current stage</th>
                  <th>Owner</th>
                  <th>Statutory due</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedApps.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <span 
                        className="table-id-link" 
                        onClick={() => handleOpenCase(app.id)}
                      >
                        {app.id}
                      </span>
                      <span className="table-subtext">{app.institution}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{app.stage}</span>
                      <span className="table-subtext">{app.route}</span>
                    </td>
                    <td>{app.ownerRole}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span>{dateLabel(app.dueDate)}</span>
                        {renderDueBadge(app.dueDate)}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={app.status} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleOpenCase(app.id)}
                      >
                        Open →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>

        {/* Live Automation / Regulatory Stream */}
        <GlassPanel
          title="Automation & audit stream"
          subtitle="Event → validated rule → authorized action → audit"
          action={
            <button 
              type="button" 
              className="btn btn-sm btn-ghost" 
              onClick={() => onNavigate('audit')}
            >
              Open audit log <ArrowRight size={13} />
            </button>
          }
        >
          <div className="activity-stream">
            {state.audit.slice(0, 5).map((entry) => (
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
                    <span>·</span>
                    <span className="code-tag">{entry.rule}</span>
                    <span>·</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{entry.correlation}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="notice-box notice-info">
            <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong>Idempotency protected:</strong> The automation engine evaluates rules against target records and threshold windows. Re-running the cycle without date progression will not generate duplicate side-effects.
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Secondary 3-Column Grid */}
      <div className="grid-3-cols">
        {/* EVC Queue Card */}
        <GlassPanel
          title="EVC desk"
          subtitle="Eligible committee queues"
          action={
            <button 
              type="button" 
              className="btn btn-sm btn-ghost" 
              onClick={() => onNavigate('evc')}
            >
              Open desk →
            </button>
          }
        >
          <div className="queue-list">
            {openEvc.slice(0, 3).map((e) => (
              <div key={e.id} className="queue-item">
                <div className="queue-item-info">
                  <div className="queue-item-title">{e.appId} · {e.institution}</div>
                  <div className="queue-item-sub">
                    {e.visitDate ? `Visit scheduled: ${dateLabel(e.visitDate)}` : 'Needs panel scheduling'}
                  </div>
                </div>
                <StatusBadge status={e.status} />
              </div>
            ))}
            {openEvc.length === 0 && (
              <div className="empty-state">No open EVC tasks in queue.</div>
            )}
          </div>
        </GlassPanel>

        {/* Compliance Due Card */}
        <GlassPanel
          title="Compliance due"
          subtitle="Statutory undertakings"
          action={
            <button 
              type="button" 
              className="btn btn-sm btn-ghost" 
              onClick={() => onNavigate('compliance')}
            >
              Review →
            </button>
          }
        >
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
          </div>
        </GlassPanel>

        {/* Document Validity Card */}
        <GlassPanel
          title="Document validity"
          subtitle="Safety & lease registrations"
          action={
            <button 
              type="button" 
              className="btn btn-sm btn-ghost" 
              onClick={() => onNavigate('documents')}
            >
              Review →
            </button>
          }
        >
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
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};
