import React from 'react';
import { Check } from 'lucide-react';

interface StageTimelineProps {
  stages: string[];
  currentStage: string;
}

export const StageTimeline: React.FC<StageTimelineProps> = ({ stages, currentStage }) => {
  const currentIndex = stages.indexOf(currentStage);

  return (
    <div className="stage-timeline-container">
      {stages.map((stage, index) => {
        const isDone = currentIndex >= 0 && index < currentIndex;
        const isCurrent = stage === currentStage;
        const statusLabel = isDone
          ? 'Completed'
          : isCurrent
          ? 'Current stage'
          : 'Pending';

        return (
          <div
            key={stage}
            className={`stage-step-card ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
          >
            <div className="stage-step-num">
              {isDone ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#86efac' }}>
                  <Check size={11} strokeWidth={3} /> STEP {index + 1}
                </span>
              ) : (
                `STEP ${index + 1}`
              )}
            </div>
            <div className="stage-step-name">{stage}</div>
            <div className="stage-step-status">{statusLabel}</div>
          </div>
        );
      })}
    </div>
  );
};
