import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { ScreenType } from '../types/index';
import type { EVCTask } from '../types/domain';
import { GlassPanel } from '../components/GlassPanel';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { CalendarClock, CheckCircle2, Users, FileCheck2 } from 'lucide-react';

interface EVCDeskScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const EVCDeskScreen: React.FC<EVCDeskScreenProps> = ({ onNavigate, onToast }) => {
  const { 
    state, 
    dateLabel, 
    can, 
    scheduleEVC, 
    submitEVCReport, 
    setSelectedAppId 
  } = useApp();

  // Modals state
  const [selectedEvc, setSelectedEvc] = useState<EVCTask | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [visitDateInput, setVisitDateInput] = useState('2026-11-04');
  const [panelInput, setPanelInput] = useState('Prof. A. Kulkarni (Chairman), Dr. R. Verma (Subject Expert)');

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportOutcome, setReportOutcome] = useState<'Satisfactory' | 'Deficiencies Noted'>('Satisfactory');
  const [reportRemarks, setReportRemarks] = useState('');

  const totalTasks = state.evcs.length;
  const scheduledCount = state.evcs.filter((e) => e.status === 'Scheduled').length;
  const completedCount = state.evcs.filter((e) => e.status === 'Completed').length;
  const pendingSchedulingCount = state.evcs.filter((e) => e.status === 'Needs scheduling').length;

  const handleOpenScheduleModal = (evc: EVCTask) => {
    setSelectedEvc(evc);
    setIsScheduleModalOpen(true);
  };

  const handleOpenReportModal = (evc: EVCTask) => {
    setSelectedEvc(evc);
    setIsReportModalOpen(true);
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvc) return;
    if (!visitDateInput) {
      onToast('Please specify an inspection visit date.', 'warning');
      return;
    }
    if (!panelInput.trim()) {
      onToast('Please specify the assigned committee panel experts.', 'warning');
      return;
    }

    scheduleEVC(selectedEvc.id, visitDateInput, panelInput.trim());
    onToast(`Visit scheduled for ${selectedEvc.appId} on ${dateLabel(visitDateInput)}.`, 'success');
    setIsScheduleModalOpen(false);
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvc) return;

    submitEVCReport(selectedEvc.id, reportOutcome);
    onToast(`EVC Report submitted (${reportOutcome}) for ${selectedEvc.appId}. Linked application advanced to next stage!`, 'success');
    setIsReportModalOpen(false);
  };

  const handleOpenCase = (appId: string) => {
    setSelectedAppId(appId);
    onNavigate('case');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Expert Visit Committee operations</div>
          <h1>EVC desk</h1>
          <p>
            Queue of applications requiring physical or virtual committee scrutiny. Scheduling, visit execution, and committee report submission are separately tracked.
          </p>
        </div>
      </div>

      {/* EVC Metrics */}
      <div className="metrics-grid">
        <MetricCard
          label="Total eligible cases"
          value={totalTasks}
          subtitle="On EVC-required routes"
          icon={<CalendarClock size={18} />}
        />
        <MetricCard
          label="Pending scheduling"
          value={pendingSchedulingCount}
          subtitle="Awaiting panel assignment"
          icon={<Users size={18} />}
        />
        <MetricCard
          label="Visits scheduled"
          value={scheduledCount}
          subtitle="Inspections pending"
          icon={<CheckCircle2 size={18} />}
        />
        <MetricCard
          label="Reports submitted"
          value={completedCount}
          subtitle="Advanced to committee review"
          icon={<FileCheck2 size={18} />}
        />
      </div>

      {/* EVC Queue Table */}
      <GlassPanel
        title="Eligible scheduling queue"
        subtitle="Route prerequisites must be satisfied before cases appear here"
      >
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Application</th>
                <th>Institution</th>
                <th>Queue state</th>
                <th>Visit date</th>
                <th>Assigned panel</th>
                <th>Report status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {state.evcs.map((evc) => (
                <tr key={evc.id}>
                  <td>
                    <span 
                      className="table-id-link" 
                      onClick={() => handleOpenCase(evc.appId)}
                      title="Inspect case detail"
                    >
                      {evc.appId}
                    </span>
                    <span className="table-subtext">{evc.id}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{evc.institution}</span>
                    <span className="table-subtext">Coordinator: {evc.coordinatorRole}</span>
                  </td>
                  <td>
                    <StatusBadge status={evc.status} />
                  </td>
                  <td>
                    {evc.visitDate ? (
                      <span style={{ fontWeight: 600, color: 'var(--text-white)' }}>
                        {dateLabel(evc.visitDate)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>
                        Not scheduled
                      </span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {evc.panel || '—'}
                    </span>
                  </td>
                  <td>
                    <StatusBadge 
                      status={evc.reportStatus === 'Submitted' ? 'Submitted' : 'Pending Report'} 
                      kind={evc.reportStatus === 'Submitted' ? 'green' : 'amber'}
                    />
                  </td>
                  <td>
                    {evc.status === 'Needs scheduling' ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => handleOpenScheduleModal(evc)}
                        disabled={!can('schedule')}
                        title={can('schedule') ? 'Schedule EVC inspection' : 'Requires Committee Coordinator role'}
                      >
                        Schedule visit
                      </button>
                    ) : evc.status === 'Scheduled' ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => handleOpenReportModal(evc)}
                        disabled={!can('evcReport')}
                        title={can('evcReport') ? 'Submit visit report findings' : 'Requires Committee Coordinator role'}
                      >
                        Submit report →
                      </button>
                    ) : (
                      <span className="pill pill-green">
                        <CheckCircle2 size={11} /> Completed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {state.evcs.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No applications currently require committee visit scheduling.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {/* Schedule Committee Visit Modal */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title={`Schedule Committee Visit: ${selectedEvc?.appId}`}
        description="Assign inspection visit date and participating expert committee members."
        footerActions={
          <>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={() => setIsScheduleModalOpen(false)}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleScheduleSubmit}
            >
              Confirm Visit Schedule
            </button>
          </>
        }
      >
        <form onSubmit={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)' }}>
              Visit Date *
            </label>
            <input
              type="date"
              value={visitDateInput}
              onChange={(e) => setVisitDateInput(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)' }}>
              Assigned Expert Panel Members *
            </label>
            <textarea
              rows={3}
              value={panelInput}
              onChange={(e) => setPanelInput(e.target.value)}
              placeholder="e.g. Prof. A. Kulkarni (Chairman), Dr. R. Verma (Subject Expert)"
              style={{ width: '100%', resize: 'vertical' }}
              required
            />
          </div>
        </form>
      </Modal>

      {/* Submit Report Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title={`Submit EVC Inspection Report: ${selectedEvc?.appId}`}
        description="Record expert committee findings. Submitting will complete EVC and advance the application to report scrutiny."
        footerActions={
          <>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={() => setIsReportModalOpen(false)}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleReportSubmit}
            >
              Submit & Advance Case
            </button>
          </>
        }
      >
        <form onSubmit={handleReportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)', display: 'block', marginBottom: 8 }}>
              Committee Finding Outcome *
            </label>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text-white)' }}>
                <input
                  type="radio"
                  name="reportOutcome"
                  value="Satisfactory"
                  checked={reportOutcome === 'Satisfactory'}
                  onChange={() => setReportOutcome('Satisfactory')}
                />
                Satisfactory (Recommended)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text-white)' }}>
                <input
                  type="radio"
                  name="reportOutcome"
                  value="Deficiencies Noted"
                  checked={reportOutcome === 'Deficiencies Noted'}
                  onChange={() => setReportOutcome('Deficiencies Noted')}
                />
                Deficiencies Noted
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-white)' }}>
              Summary Observations & Recommendations
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Laboratories, library volumes, and built-up area verified in compliance with APH standards."
              value={reportRemarks}
              onChange={(e) => setReportRemarks(e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
