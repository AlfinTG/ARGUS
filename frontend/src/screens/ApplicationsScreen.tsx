import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { ScreenType } from '../types/index';
import type { RouteType, InstitutionalFilingResult } from '../types/domain';
import { GlassPanel } from '../components/GlassPanel';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { ApplicationWizard } from '../components/ApplicationWizard';
import { Search, Plus, Filter, FileText } from 'lucide-react';

interface ApplicationsScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const ApplicationsScreen: React.FC<ApplicationsScreenProps> = ({ onNavigate, onToast }) => {
  const { 
    state, 
    dayDiff, 
    dateLabel, 
    setSelectedAppId, 
    createApplication,
    refreshBackend,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');

  // Wizard & Modal State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isNewAppModalOpen, setIsNewAppModalOpen] = useState(false);
  const [newInstitution, setNewInstitution] = useState('');
  const [newType, setNewType] = useState('Renewal');
  const [newRegion, setNewRegion] = useState('Central');
  const [newRoute, setNewRoute] = useState<RouteType>('Scrutiny + EVC');
  const [newDueDate, setNewDueDate] = useState('2026-11-05');

  const filteredApps = useMemo(() => {
    return state.apps.filter((app) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || app.id.toLowerCase().includes(q) || app.institution.toLowerCase().includes(q);
      const matchesStage = !selectedStage || app.stage === selectedStage;
      const matchesStatus = !selectedStatus || app.status === selectedStatus;
      const matchesRegion = !selectedRegion || app.region === selectedRegion;
      return matchesSearch && matchesStage && matchesStatus && matchesRegion;
    });
  }, [state.apps, searchQuery, selectedStage, selectedStatus, selectedRegion]);

  const handleOpenCase = (appId: string) => {
    setSelectedAppId(appId);
    onNavigate('case');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstitution.trim()) {
      onToast('Please enter an institution name.', 'warning');
      return;
    }
    if (!newDueDate) {
      onToast('Please specify a statutory due date.', 'warning');
      return;
    }

    createApplication({
      institution: newInstitution.trim(),
      type: newType,
      region: newRegion,
      route: newRoute,
      dueDate: newDueDate,
    });

    onToast(`Synthetic application created successfully!`, 'success');
    setIsNewAppModalOpen(false);
    setNewInstitution('');
  };

  const renderDueBadge = (dateStr: string | null | undefined) => {
    const diff = dayDiff(dateStr);
    if (diff === null) return <StatusBadge status="No deadline" kind="muted" />;
    if (diff < 0) return <StatusBadge status={`${Math.abs(diff)}d overdue`} kind="red" />;
    if (diff === 0) return <StatusBadge status="Due today" kind="amber" />;
    if (diff <= state.settings.reminderDays) return <StatusBadge status={`${diff}d left`} kind="amber" />;
    return <StatusBadge status="On track" kind="green" />;
  };

  const handleWizardSuccess = async (result: InstitutionalFilingResult) => {
    setIsWizardOpen(false);
    onToast(result.message, 'success');
    await refreshBackend();
    setSelectedAppId(result.application.id);
    onNavigate('case');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Case management</div>
          <h1>Applications</h1>
          <p>
            Regulatory case registry. Route progression depends on the selected route profile, stage prerequisites, and authorized demo roles.
          </p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: 10 }}>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={() => setIsWizardOpen(true)}
            id="open-wizard-btn"
          >
            <FileText size={16} /> File Application (APH 2026-27)
          </button>
          {state.role !== 'Institution User' && (
            <button 
              type="button" 
              className="btn btn-outline"
              onClick={() => setIsNewAppModalOpen(true)}
            >
              <Plus size={16} /> New demo application
            </button>
          )}
        </div>
      </div>

      <GlassPanel>
        {/* Filter Controls */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search 
              size={16} 
              style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-faint)' }} 
            />
            <input
              type="text"
              placeholder="Search by ID or institution name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 36, width: '100%' }}
              aria-label="Search applications"
            />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              aria-label="Filter by stage"
            >
              <option value="">All stages</option>
              <option value="Initial Scrutiny">Initial Scrutiny</option>
              <option value="Institution Response">Institution Response</option>
              <option value="EVC Scheduling">EVC Scheduling</option>
              <option value="EVC Report Review">EVC Report Review</option>
              <option value="SAC/SHC Review">SAC/SHC Review</option>
              <option value="Decision Pending">Decision Pending</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="In progress">In progress</option>
              <option value="Action required">Action required</option>
              <option value="Awaiting institution">Awaiting institution</option>
              <option value="Awaiting EVC">Awaiting EVC</option>
              <option value="Decision pending">Decision pending</option>
              <option value="Closed">Closed</option>
            </select>

            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              aria-label="Filter by region"
            >
              <option value="">All regions</option>
              <option value="Central">Central</option>
              <option value="West">West</option>
              <option value="North">North</option>
              <option value="South">South</option>
            </select>

            {(searchQuery || selectedStage || selectedStatus || selectedRegion) && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStage('');
                  setSelectedStatus('');
                  setSelectedRegion('');
                }}
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={13} />
          Showing {filteredApps.length} of {state.apps.length} applications
        </div>

        {/* Applications Table */}
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Application / Institution</th>
                <th>Route profile</th>
                <th>Stage</th>
                <th>Owner role</th>
                <th>Statutory due</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.map((app) => (
                <tr key={app.id}>
                  <td>
                    <div 
                      className="table-college-title" 
                      onClick={() => handleOpenCase(app.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleOpenCase(app.id)}
                      title={`Open application for ${app.institution}`}
                    >
                      {app.institution}
                    </div>
                    <div className="table-subtext">
                      <span 
                        className="table-id-link" 
                        onClick={() => handleOpenCase(app.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleOpenCase(app.id)}
                      >
                        {app.id}
                      </span>
                      <span className="table-subtext-sep">·</span>
                      <span>{app.region}</span>
                      <span className="table-subtext-sep">·</span>
                      <span>{app.type}</span>
                    </div>
                  </td>
                  <td>
                    <span className="code-tag">{app.route}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{app.stage}</span>
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
                      Open scrutiny →
                    </button>
                  </td>
                </tr>
              ))}
              {filteredApps.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No matching applications found. Adjust filters or create a new demo case.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {/* New Application Modal */}
      <Modal
        isOpen={isNewAppModalOpen}
        onClose={() => setIsNewAppModalOpen(false)}
        title="Create Synthetic Demo Application"
        description="Provision a synthetic AICTE approval application to test routing, scrutiny transitions, and deadlines."
        footerActions={
          <>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={() => setIsNewAppModalOpen(false)}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleCreateSubmit}
            >
              Create Application
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)' }}>
              Institution Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Pune Institute of Advanced Technology"
              value={newInstitution}
              onChange={(e) => setNewInstitution(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)' }}>
                Application Type
              </label>
              <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                <option value="Renewal">Renewal</option>
                <option value="New approval">New approval</option>
                <option value="Extension of Approval">Extension of Approval</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)' }}>
                Region
              </label>
              <select value={newRegion} onChange={(e) => setNewRegion(e.target.value)}>
                <option value="Central">Central</option>
                <option value="West">West</option>
                <option value="North">North</option>
                <option value="South">South</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)' }}>
                Route Profile
              </label>
              <select value={newRoute} onChange={(e) => setNewRoute(e.target.value as RouteType)}>
                <option value="Scrutiny only">Scrutiny only</option>
                <option value="Scrutiny + EVC">Scrutiny + EVC</option>
                <option value="EVC + SAC/SHC">EVC + SAC/SHC</option>
                <option value="Only EVC">Only EVC</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)' }}>
                Statutory Due Date
              </label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                required
              />
            </div>
          </div>
        </form>
      </Modal>

      {isWizardOpen && (
        <ApplicationWizard
          onClose={() => setIsWizardOpen(false)}
          onSuccess={handleWizardSuccess}
          onToast={onToast}
        />
      )}
    </div>
  );
};
