import React from 'react';

interface StatusBadgeProps {
  status: string;
  kind?: 'green' | 'amber' | 'red' | 'blue' | 'lime' | 'purple' | 'muted';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, kind, className = '' }) => {
  let resolvedKind = kind;

  if (!resolvedKind) {
    const s = status.toLowerCase();
    if (
      s.includes('overdue') || s.includes('expired') || s.includes('reject') ||
      s.includes('blocked') || s.includes('denied')
    ) {
      resolvedKind = 'red';
    } else if (
      s.includes('due') || s.includes('pending') || s.includes('action') ||
      s.includes('awaiting') || s.includes('scheduling') || s.includes('review') ||
      s.includes('warning')
    ) {
      resolvedKind = 'amber';
    } else if (
      s.includes('verified') || s.includes('completed') || s.includes('closed') ||
      s.includes('resolved') || s.includes('approved') || s.includes('valid') ||
      s.includes('on track')
    ) {
      resolvedKind = 'green';
    } else if (s.includes('decision') || s.includes('scrutiny') || s.includes('committee')) {
      resolvedKind = 'blue';
    } else {
      resolvedKind = 'muted';
    }
  }

  // Map lime/purple to blue for light theme compatibility
  const cssKind = resolvedKind === 'lime' || resolvedKind === 'purple' ? 'blue' : resolvedKind;

  return (
    <span className={`status-badge ${cssKind} ${className}`}>
      {status}
    </span>
  );
};
