import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { ScreenType, RoleType } from '../types/index';
import { AUTOMATION_RULES } from '../data/seedData';
import { GlassPanel } from '../components/GlassPanel';
import { 
  Play, 
  Save, 
  Info
} from 'lucide-react';

interface RulesConsoleScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const RulesConsoleScreen: React.FC<RulesConsoleScreenProps> = ({ onToast }) => {
  const { 
    state, 
    updateSettings, 
    setSimDate, 
    runAutomationCycle, 
    addAudit 
  } = useApp();

  const [reminderDaysInput, setReminderDaysInput] = useState(state.settings.reminderDays);
  const [expiryDaysInput, setExpiryDaysInput] = useState(state.settings.expiryDays);
  const [escalationRoleInput, setEscalationRoleInput] = useState<RoleType>(state.settings.escalationRole);
  const [simDateInput, setSimDateInput] = useState(state.simDate);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      reminderDays: Number(reminderDaysInput),
      expiryDays: Number(expiryDaysInput),
      escalationRole: escalationRoleInput,
    });
    setSimDate(simDateInput);

    addAudit(
      state.role,
      'System Settings',
      'System',
      `Updated thresholds: reminderDays=${reminderDaysInput}, expiryDays=${expiryDaysInput}, escalationRole=${escalationRoleInput}, simDate=${simDateInput}`
    );

    onToast('Demo policy configuration and simulation date saved!', 'success');
  };

  const handleEvaluateNow = () => {
    const res = runAutomationCycle();
    onToast(res.message, res.newAlertsCount > 0 ? 'warning' : 'info');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Configuration & governance</div>
          <h1>Automation rules</h1>
          <p>
            Event-to-action engine configuration. Modify demo deadline windows, change the simulation reference clock, and trigger safe automated scans.
          </p>
        </div>
        <div className="page-actions">
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={handleSaveSettings}
          >
            <Save size={15} /> Save demo settings
          </button>
        </div>
      </div>

      {/* Official Handbook Warning */}
      <div className="demo-banner">
        <span>⚠</span>
        <div>
          <strong>AICTE Regulatory Notice</strong>
          Threshold parameters below are demo configurations for hackathon simulation testing. Official AICTE Approval Process Handbook (APH 2024–2027) and statutory circulars dictate statutory timelines.
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid-2-cols">
        {/* Rule Catalogue */}
        <GlassPanel 
          title="Rule Catalogue" 
          subtitle="Registered autonomous event-to-action rules"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {AUTOMATION_RULES.map((rule) => (
              <div 
                key={rule.id}
                style={{
                  background: 'rgba(0, 0, 0, 0.22)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: 14,
                  transition: 'border-color var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="code-tag">{rule.id}</span>
                    <strong style={{ fontSize: 13, color: 'var(--text-white)' }}>{rule.name}</strong>
                  </div>
                  <span className="pill pill-lime" style={{ fontSize: 9.5 }}>Active</span>
                </div>

                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  <span style={{ color: 'var(--accent-lime)', fontWeight: 600 }}>Trigger:</span> {rule.trigger}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-main)', marginTop: 4, lineHeight: 1.45 }}>
                  <span style={{ color: 'var(--text-faint)', fontWeight: 600 }}>Action:</span> {rule.action}
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Demo Settings & Clock */}
        <div>
          <GlassPanel 
            title="Demo Policy Thresholds" 
            subtitle="Configure local threshold parameters"
          >
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)' }}>
                  Upcoming Deadline Reminder Window (days before due)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={reminderDaysInput}
                  onChange={(e) => setReminderDaysInput(Number(e.target.value))}
                  required
                />
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                  Cases or obligations due within this window trigger rule DL-01.
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)' }}>
                  Document Expiry Warning Window (days before expiry)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={expiryDaysInput}
                  onChange={(e) => setExpiryDaysInput(Number(e.target.value))}
                  required
                />
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                  Certificates expiring within this window trigger renewal warning rule DOC-01.
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)' }}>
                  Default Escalation Recipient Role
                </label>
                <select
                  value={escalationRoleInput}
                  onChange={(e) => setEscalationRoleInput(e.target.value as RoleType)}
                >
                  <option value="Regional Officer">Regional Officer</option>
                  <option value="Competent Authority">Competent Authority</option>
                  <option value="Scrutiny Officer">Scrutiny Officer</option>
                  <option value="Committee Coordinator">Committee Coordinator</option>
                </select>
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                  Recipient assigned for overdue escalation alerts under DL-02.
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)' }}>
                  Simulation Reference Clock Date
                </label>
                <input
                  type="date"
                  value={simDateInput}
                  onChange={(e) => setSimDateInput(e.target.value)}
                  required
                />
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                  Advancing or rewinding this date tests deadline and expiry calculations deterministically.
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  <Save size={15} /> Save settings
                </button>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={handleEvaluateNow}
                  title="Run rule scan now"
                >
                  <Play size={15} /> Evaluate rules now
                </button>
              </div>
            </form>

            <div className="notice-box notice-info" style={{ marginTop: 20 }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>Simulation Sandbox:</strong> Modifying dates and thresholds does not contact external agencies. Repeat runs check idempotency cache to prevent duplicate alerts.
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
};
