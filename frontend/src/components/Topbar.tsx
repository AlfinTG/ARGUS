import React from 'react';
import { Menu } from 'lucide-react';
import { ALL_ROLES } from '../types';
import type { ScreenType, RoleType } from '../types';

interface TopbarProps {
  currentScreen: ScreenType;
  selectedCaseId?: string | null;
  currentRole: RoleType;
  onRoleChange: (role: RoleType) => void;
  simulationDate: string;
  isBackendConnected?: boolean;
  onToggleMobileMenu: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentScreen,
  selectedCaseId,
  currentRole,
  onRoleChange,
  simulationDate,
  isBackendConnected = false,
  onToggleMobileMenu,
}) => {
  const getScreenMeta = (screen: ScreenType) => {
    switch (screen) {
      case 'overview':
        return { crumb: 'Overview', title: 'Approval operations' };
      case 'applications':
        return { crumb: 'Applications', title: 'Case management' };
      case 'case':
        return { crumb: `Applications / ${selectedCaseId || 'Detail'}`, title: 'Case progression & scrutiny' };
      case 'compliance':
        return { crumb: 'Compliance', title: 'Institutional obligations & undertakings' };
      case 'evc':
        return { crumb: 'EVC desk', title: 'Expert Visit Committee operations' };
      case 'documents':
        return { crumb: 'Documents', title: 'Institutional document register' };
      case 'alerts':
        return { crumb: 'Alerts', title: 'Escalation & alert management' };
      case 'audit':
        return { crumb: 'Audit trail', title: 'Immutable regulatory event stream' };
      case 'rules':
        return { crumb: 'Automation rules', title: 'Workflow policy & threshold configuration' };
    }
  };

  const meta = getScreenMeta(currentScreen);

  // Compute initials for avatar (e.g. "Scrutiny Officer" -> "SO")
  const getInitials = (role: RoleType) => {
    return role
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="mobile-toggle"
          onClick={onToggleMobileMenu}
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <div className="breadcrumbs">
            <span>ARGUS</span>
            <span>/</span>
            <span className="current">{meta.crumb}</span>
          </div>
          <div className="topbar-title">{meta.title}</div>
        </div>
      </div>

      <div className="topbar-right">
        <div
          className={`api-badge ${isBackendConnected ? 'connected' : 'offline'}`}
          title={
            isBackendConnected
              ? 'FastAPI REST backend connected (http://localhost:8000/api/v1)'
              : 'Running in offline in-memory synthetic state mode'
          }
        >
          <span className={isBackendConnected ? 'api-dot-online' : 'api-dot-offline'} />
          <span>{isBackendConnected ? 'Live API' : 'Demo Mode'}</span>
        </div>

        <div className="sim-date-badge" title="Simulation reference date for deterministic deadline calculations">
          <span className="sim-date-dot" />
          <span>Sim Date: {simulationDate}</span>
        </div>

        <div className="role-switcher">
          <label htmlFor="role-select">Demo Role</label>
          <select
            id="role-select"
            className="role-select"
            value={currentRole}
            onChange={(e) => onRoleChange(e.target.value as RoleType)}
          >
            {ALL_ROLES.map((role) => (
              <option key={role} value={role} style={{ background: '#0a1a12', color: '#fff' }}>
                {role}
              </option>
            ))}
          </select>
        </div>

        <div className="role-avatar" title={`Active role: ${currentRole}`}>
          {getInitials(currentRole)}
        </div>
      </div>
    </header>
  );
};
