import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  accent?: 'lime' | 'amber' | 'red' | 'green' | 'blue';
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtitle,
  icon,
  onClick,
}) => {
  return (
    <div 
      className="metric-card" 
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="metric-head">
        <span>{label}</span>
        <div className="metric-icon-wrap">
          {icon}
        </div>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-sub">{subtitle}</div>
    </div>
  );
};
