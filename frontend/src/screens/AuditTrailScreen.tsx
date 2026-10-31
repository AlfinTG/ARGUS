import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { ScreenType } from '../types/index';
import type { AuditEventType } from '../types/domain';
import { GlassPanel } from '../components/GlassPanel';
import { StatusBadge } from '../components/StatusBadge';
import { Search, Download, History } from 'lucide-react';

interface AuditTrailScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const AuditTrailScreen: React.FC<AuditTrailScreenProps> = ({ onToast }) => {
  const { state } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');

  const filteredAudit = useMemo(() => {
    return state.audit.filter((entry) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q || 
        entry.id.toLowerCase().includes(q) || 
        entry.actor.toLowerCase().includes(q) || 
        entry.target.toLowerCase().includes(q) || 
        entry.rule.toLowerCase().includes(q) || 
        entry.detail.toLowerCase().includes(q) || 
        entry.correlation.toLowerCase().includes(q);
      const matchesType = !selectedType || entry.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [state.audit, searchQuery, selectedType]);

  const handleExportCSV = () => {
    if (state.audit.length === 0) {
      onToast('No audit events to export.', 'warning');
      return;
    }

    const headers = ['ID', 'Time', 'Actor', 'Target', 'Type', 'Rule', 'Detail', 'Correlation ID'];
    const rows = filteredAudit.map((e) => [
      e.id,
      e.time,
      e.actor,
      e.target,
      e.type,
      e.rule,
      `"${e.detail.replace(/"/g, '""')}"`,
      e.correlation,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `argus_audit_log_${state.simDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onToast(`Exported ${filteredAudit.length} audit event(s) to CSV!`, 'success');
  };

  const getEventTypeKind = (type: AuditEventType): 'green' | 'amber' | 'red' | 'blue' | 'lime' | 'purple' | 'muted' => {
    switch (type) {
      case 'Workflow': return 'lime';
      case 'Automation': return 'blue';
      case 'Decision': return 'green';
      case 'Compliance': return 'purple';
      case 'Document': return 'amber';
      case 'EVC': return 'green';
      case 'Alert': return 'red';
      case 'System': return 'muted';
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Governance & traceability</div>
          <h1>Audit trail</h1>
          <p>
            Immutable chronological regulatory log. Correlates human transactions, role actions, rule evaluations, and system state transitions with persistent reference IDs.
          </p>
        </div>
        <div className="page-actions">
          <button 
            type="button" 
            className="btn btn-ghost"
            onClick={handleExportCSV}
            title="Download CSV export"
          >
            <Download size={15} /> Export CSV
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
              placeholder="Search by actor, target ID, rule, correlation ID, or detail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 36, width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              aria-label="Filter by event type"
            >
              <option value="">All event types</option>
              <option value="Workflow">Workflow</option>
              <option value="Automation">Automation</option>
              <option value="Compliance">Compliance</option>
              <option value="Document">Document</option>
              <option value="EVC">EVC</option>
              <option value="Alert">Alert</option>
              <option value="Decision">Decision</option>
              <option value="System">System</option>
            </select>

            {(searchQuery || selectedType) && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('');
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <History size={13} />
          Displaying {filteredAudit.length} immutable regulatory log entries
        </div>

        {/* Audit Table */}
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time (Sim)</th>
                <th>Actor</th>
                <th>Target</th>
                <th>Type</th>
                <th>Rule</th>
                <th>Outcome / Log Detail</th>
                <th>Correlation</th>
              </tr>
            </thead>
            <tbody>
              {filteredAudit.map((entry) => (
                <tr key={entry.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 11.5, color: 'var(--text-faint)' }}>
                    {entry.time}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--text-white)' }}>
                      {entry.actor}
                    </span>
                  </td>
                  <td>
                    <span className="code-tag">{entry.target}</span>
                  </td>
                  <td>
                    <StatusBadge 
                      status={entry.type} 
                      kind={getEventTypeKind(entry.type)} 
                    />
                  </td>
                  <td>
                    <span className="code-tag">{entry.rule}</span>
                  </td>
                  <td style={{ maxWidth: 420 }}>
                    <span style={{ fontSize: 12.5, color: 'var(--text-main)', lineHeight: 1.4 }}>
                      {entry.detail}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-lime)' }}>
                      {entry.correlation}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredAudit.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No audit records matching your search query.
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
