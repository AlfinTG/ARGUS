import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { ScreenType } from '../types/index';
import { GlassPanel } from '../components/GlassPanel';
import { StatusBadge } from '../components/StatusBadge';
import { Search, Play, CheckCircle2, Eye } from 'lucide-react';

interface AlertsScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const AlertsScreen: React.FC<AlertsScreenProps> = ({ onNavigate, onToast }) => {
  const { 
    state, 
    acknowledgeAlert, 
    resolveAlert, 
    runAutomationCycle, 
    setSelectedAppId 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');

  const filteredAlerts = useMemo(() => {
    return state.alerts.filter((a) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q || 
        a.title.toLowerCase().includes(q) || 
        a.target.toLowerCase().includes(q) || 
        a.ruleId.toLowerCase().includes(q) || 
        a.message.toLowerCase().includes(q);
      const matchesState = !selectedState || a.status === selectedState;
      return matchesSearch && matchesState;
    });
  }, [state.alerts, searchQuery, selectedState]);

  const handleRunCycle = () => {
    const res = runAutomationCycle();
    onToast(res.message, res.newAlertsCount > 0 ? 'warning' : 'info');
  };

  const handleAcknowledge = (id: string, target: string) => {
    acknowledgeAlert(id);
    onToast(`Alert for ${target} acknowledged by ${state.role}.`, 'info');
  };

  const handleResolve = (id: string, target: string) => {
    resolveAlert(id);
    onToast(`Alert for ${target} marked as resolved.`, 'success');
  };

  const handleTargetClick = (target: string) => {
    if (target.startsWith('APP-')) {
      setSelectedAppId(target);
      onNavigate('case');
    } else if (target.startsWith('CMP-')) {
      onNavigate('compliance');
    } else if (target.startsWith('DOC-')) {
      onNavigate('documents');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Action queue</div>
          <h1>Alerts & escalations</h1>
          <p>
            Regulatory triage queue. Automated scans flag upcoming deadlines and statutory expirations. Acknowledging an alert records governance tracking without modifying underlying case records.
          </p>
        </div>
        <div className="page-actions">
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={handleRunCycle}
          >
            <Play size={16} /> Run automation cycle
          </button>
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
              placeholder="Search alert title, target ID, rule, or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 36, width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              aria-label="Filter by alert status"
            >
              <option value="">All alert states</option>
              <option value="Open">Open</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Resolved">Resolved</option>
            </select>

            {(searchQuery || selectedState) && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedState('');
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Alerts Table */}
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Alert / Notification</th>
                <th>Target record</th>
                <th>Rule / trigger</th>
                <th>Recipient role</th>
                <th>Generated at</th>
                <th>State</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((alert) => (
                <tr key={alert.id}>
                  <td style={{ maxWidth: 360 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-white)' }}>
                      {alert.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
                      {alert.message}
                    </div>
                  </td>
                  <td>
                    <span 
                      className="table-id-link"
                      onClick={() => handleTargetClick(alert.target)}
                      title="Navigate to target entity"
                    >
                      {alert.target}
                    </span>
                  </td>
                  <td>
                    <span className="code-tag">{alert.ruleId}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: 'var(--text-main)' }}>
                      {alert.recipientRole}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
                      {alert.createdAt}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={alert.status} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {alert.status === 'Open' && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => handleAcknowledge(alert.id, alert.target)}
                            title="Acknowledge alert"
                          >
                            <Eye size={12} /> Ack
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => handleResolve(alert.id, alert.target)}
                            title="Mark resolved"
                          >
                            Resolve
                          </button>
                        </>
                      )}
                      {alert.status === 'Acknowledged' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleResolve(alert.id, alert.target)}
                        >
                          Resolve
                        </button>
                      )}
                      {alert.status === 'Resolved' && (
                        <span className="pill pill-green">
                          <CheckCircle2 size={11} /> Closed
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAlerts.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No alerts in this view. Click "Run automation cycle" above to trigger deadline scans.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
};
