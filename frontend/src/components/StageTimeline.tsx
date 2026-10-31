import React from 'react';
import { Check, ShieldCheck, XCircle, AlertTriangle } from 'lucide-react';

interface StageTimelineProps {
  stages: string[];
  currentStage: string;
  resumeStage?: string;
}

export const StageTimeline: React.FC<StageTimelineProps> = ({ stages, currentStage, resumeStage }) => {
  const isApproved = currentStage === 'Approved';
  const isRejected = currentStage === 'Rejected';
  const isInstitutionResponse = currentStage === 'Institution Response';

  // Construct effective stages list for display
  let displayStages = [...stages];
  if (isApproved) {
    if (!displayStages.includes('Approved')) {
      displayStages.push('Approved');
    }
  } else if (isRejected) {
    if (!displayStages.includes('Rejected')) {
      displayStages.push('Rejected');
    }
  }

  const terminalIdx = displayStages.length - 1;
  const currentIndex = isApproved || isRejected 
    ? terminalIdx 
    : displayStages.indexOf(currentStage);

  return (
    <div className="stage-timeline-container">
      {displayStages.map((stage, index) => {
        let isDone = false;
        let isCurrent = false;
        let isApprovedCard = false;
        let isRejectedCard = false;
        let isDeficiencyStep = false;
        let statusLabel = 'Pending';

        if (isApproved) {
          if (index < terminalIdx) {
            isDone = true;
            statusLabel = 'Completed';
          } else {
            isCurrent = true;
            isDone = true;
            isApprovedCard = true;
            statusLabel = 'EoA Granted';
          }
        } else if (isRejected) {
          if (index < terminalIdx) {
            isDone = true;
            statusLabel = 'Completed';
          } else {
            isCurrent = true;
            isRejectedCard = true;
            statusLabel = 'Order Issued';
          }
        } else if (isInstitutionResponse) {
          const resumeIdx = resumeStage ? displayStages.indexOf(resumeStage) : 0;
          if (index < resumeIdx) {
            isDone = true;
            statusLabel = 'Completed';
          } else if (index === resumeIdx) {
            isCurrent = true;
            isDeficiencyStep = true;
            statusLabel = 'Awaiting Response';
          } else {
            statusLabel = 'Pending';
          }
        } else {
          isDone = currentIndex >= 0 && index < currentIndex;
          isCurrent = stage === currentStage;
          statusLabel = isDone
            ? 'Completed'
            : isCurrent
            ? 'Current stage'
            : 'Pending';
        }

        return (
          <div
            key={`${stage}-${index}`}
            className={`stage-step-card ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${
              isApprovedCard ? 'approved' : ''
            } ${isRejectedCard ? 'rejected' : ''}`}
            style={{
              ...(isApprovedCard ? { borderColor: '#22c55e', background: 'rgba(34, 197, 94, 0.12)' } : {}),
              ...(isRejectedCard ? { borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.12)' } : {}),
              ...(isDeficiencyStep ? { borderColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)' } : {}),
            }}
          >
            <div className="stage-step-num">
              {isApprovedCard ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#22c55e', fontWeight: 800 }}>
                  <ShieldCheck size={12} strokeWidth={2.5} /> DETERMINATION
                </span>
              ) : isRejectedCard ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#ef4444', fontWeight: 800 }}>
                  <XCircle size={12} strokeWidth={2.5} /> DETERMINATION
                </span>
              ) : isDeficiencyStep ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#f59e0b', fontWeight: 800 }}>
                  <AlertTriangle size={12} strokeWidth={2.5} /> DEFICIENCY
                </span>
              ) : isDone ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#22c55e' }}>
                  <Check size={11} strokeWidth={3} /> STEP {index + 1}
                </span>
              ) : (
                `STEP ${index + 1}`
              )}
            </div>
            <div
              className="stage-step-name"
              style={{
                ...(isApprovedCard ? { color: '#22c55e', fontWeight: 800 } : {}),
                ...(isRejectedCard ? { color: '#ef4444', fontWeight: 800 } : {}),
                ...(isDeficiencyStep ? { color: '#f59e0b', fontWeight: 700 } : {}),
              }}
            >
              {stage}
            </div>
            <div
              className="stage-step-status"
              style={{
                ...(isApprovedCard ? { color: '#16a34a', fontWeight: 600 } : {}),
                ...(isRejectedCard ? { color: '#dc2626', fontWeight: 600 } : {}),
                ...(isDeficiencyStep ? { color: '#d97706', fontWeight: 600 } : {}),
              }}
            >
              {statusLabel}
            </div>
          </div>
        );
      })}
    </div>
  );
};
