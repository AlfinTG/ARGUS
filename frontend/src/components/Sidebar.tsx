import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  ShieldCheck, 
  CalendarClock, 
  FolderCheck, 
  BellRing, 
  History, 
  SlidersHorizontal,
  AlertCircle
} from 'lucide-react';
import type { ScreenType, NavCounts } from '../types';

interface SidebarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  counts: NavCounts;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  counts,
  isOpenMobile,
  onCloseMobile,
}) => {
  const handleNav = (screen: ScreenType) => {
    onNavigate(screen);
    onCloseMobile();
  };

  const isScreenActive = (screen: ScreenType) => {
    if (currentScreen === 'case' && screen === 'applications') return true;
    return currentScreen === screen;
  };

  return (
    <aside className={`sidebar ${isOpenMobile ? 'open' : ''}`} aria-label="Main navigation">
      <div className="brand-section">
        <div className="brand-mark">A.</div>
        <div>
          <div className="brand-title">ARGUS</div>
          <div className="brand-subtitle">AICTE Intelligence</div>
        </div>
      </div>

      <div className="nav-section-label">Operations</div>
      <nav className="nav-group">
        <button
          type="button"
          className={`nav-item ${isScreenActive('overview') ? 'active' : ''}`}
          onClick={() => handleNav('overview')}
        >
          <span className="nav-item-icon"><LayoutDashboard size={17} /></span>
          <span className="nav-item-label">Overview</span>
        </button>

        <button
          type="button"
          className={`nav-item ${isScreenActive('applications') ? 'active' : ''}`}
          onClick={() => handleNav('applications')}
        >
          <span className="nav-item-icon"><FileText size={17} /></span>
          <span className="nav-item-label">Applications</span>
          {counts.applications > 0 && <span className="nav-badge">{counts.applications}</span>}
        </button>

        <button
          type="button"
          className={`nav-item ${isScreenActive('compliance') ? 'active' : ''}`}
          onClick={() => handleNav('compliance')}
        >
          <span className="nav-item-icon"><ShieldCheck size={17} /></span>
          <span className="nav-item-label">Compliance</span>
          {counts.compliance > 0 && <span className="nav-badge">{counts.compliance}</span>}
        </button>

        <button
          type="button"
          className={`nav-item ${isScreenActive('evc') ? 'active' : ''}`}
          onClick={() => handleNav('evc')}
        >
          <span className="nav-item-icon"><CalendarClock size={17} /></span>
          <span className="nav-item-label">EVC desk</span>
          {counts.evc > 0 && <span className="nav-badge">{counts.evc}</span>}
        </button>

        <button
          type="button"
          className={`nav-item ${isScreenActive('documents') ? 'active' : ''}`}
          onClick={() => handleNav('documents')}
        >
          <span className="nav-item-icon"><FolderCheck size={17} /></span>
          <span className="nav-item-label">Documents</span>
          {counts.documents > 0 && <span className="nav-badge">{counts.documents}</span>}
        </button>

        <button
          type="button"
          className={`nav-item ${isScreenActive('alerts') ? 'active' : ''}`}
          onClick={() => handleNav('alerts')}
        >
          <span className="nav-item-icon"><BellRing size={17} /></span>
          <span className="nav-item-label">Alerts</span>
          {counts.alerts > 0 && <span className="nav-badge">{counts.alerts}</span>}
        </button>

        <button
          type="button"
          className={`nav-item ${isScreenActive('audit') ? 'active' : ''}`}
          onClick={() => handleNav('audit')}
        >
          <span className="nav-item-icon"><History size={17} /></span>
          <span className="nav-item-label">Audit trail</span>
        </button>
      </nav>

      <div className="nav-section-label">Configuration</div>
      <nav className="nav-group">
        <button
          type="button"
          className={`nav-item ${isScreenActive('rules') ? 'active' : ''}`}
          onClick={() => handleNav('rules')}
        >
          <span className="nav-item-icon"><SlidersHorizontal size={17} /></span>
          <span className="nav-item-label">Automation rules</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-heading">
          <AlertCircle size={13} /> Demonstration Lab
        </div>
        <div>Synthetic records only. External notifications & AICTE systems are simulated.</div>
      </div>
    </aside>
  );
};
