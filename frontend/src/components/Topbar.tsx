import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { ALL_ROLES } from '../types';
import type { ScreenType, RoleType } from '../types';
import { useLanguage } from '../context/LanguageContext';
import type { Translations } from '../context/LanguageContext';

interface TopbarProps {
  currentScreen: ScreenType;
  selectedCaseId?: string | null;
  currentRole: RoleType;
  onRoleChange: (role: RoleType) => void;
  simulationDate: string;
  isBackendConnected?: boolean;
  onToggleMobileMenu: () => void;
  authUser?: { fullName: string; email: string; role: string } | null;
  onSignOut?: () => void;
}

export type FontSize = 'sm' | 'md' | 'lg';

const FONT_STORAGE_KEY = 'argus_app_font_size';

export const Topbar: React.FC<TopbarProps> = ({
  currentScreen: _currentScreen,
  selectedCaseId: _selectedCaseId,
  currentRole,
  onRoleChange,
  simulationDate: _simulationDate,
  isBackendConnected = false,
  onToggleMobileMenu,
  authUser,
  onSignOut,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    try {
      const saved = localStorage.getItem(FONT_STORAGE_KEY) as FontSize | null;
      if (saved === 'sm' || saved === 'md' || saved === 'lg') return saved;
    } catch {
      // fallback
    }
    return 'md';
  });

  // Apply font size & zoom across the entire document
  const applyFontSize = (size: FontSize) => {
    setFontSize(size);
    const sizeMap: Record<FontSize, string> = { sm: '12.5px', md: '14px', lg: '16px' };
    const zoomMap: Record<FontSize, string> = { sm: '0.92', md: '1', lg: '1.1' };
    
    document.documentElement.style.fontSize = sizeMap[size];
    document.documentElement.setAttribute('data-text-size', size);
    
    // Body zoom applies proportional scaling across all existing fixed px units
    if (document.body) {
      (document.body.style as any).zoom = zoomMap[size];
    }
    
    try {
      localStorage.setItem(FONT_STORAGE_KEY, size);
    } catch {
      // ignore
    }
  };

  // Restore saved font size on initial mount
  useEffect(() => {
    applyFontSize(fontSize);
  }, []);

  return (
    <>
      {/* ── Sleek Accessibility Bar ───────────────────────────────── */}
      <div className="access-bar" role="navigation" aria-label="Accessibility and language">
        <div className="access-bar-left">
          <span className="access-gov-title">{t('govTitle')}</span>
        </div>

        <div className="access-bar-right">
          {/* Text Size Control */}
          <div className="access-control-group">
            <span className="access-label">{t('textSize')}</span>
            <div className="access-segmented-group" role="group" aria-label="Text size options">
              <button
                type="button"
                className={`access-size-btn${fontSize === 'sm' ? ' active' : ''}`}
                onClick={() => applyFontSize('sm')}
                aria-label="Smaller text"
                title="Smaller text (A-)"
              >
                A-
              </button>
              <button
                type="button"
                className={`access-size-btn${fontSize === 'md' ? ' active' : ''}`}
                onClick={() => applyFontSize('md')}
                aria-label="Normal text"
                title="Normal text (A)"
              >
                A
              </button>
              <button
                type="button"
                className={`access-size-btn${fontSize === 'lg' ? ' active' : ''}`}
                onClick={() => applyFontSize('lg')}
                aria-label="Larger text"
                title="Larger text (A+)"
              >
                A+
              </button>
            </div>
          </div>

          <div className="access-divider" aria-hidden="true" />

          {/* Bilingual Language Switcher */}
          <div className="access-segmented-group" role="group" aria-label="Language options">
            <button
              type="button"
              className={`access-lang-btn${language === 'en' ? ' active' : ''}`}
              onClick={() => setLanguage('en')}
              aria-label="Switch to English"
              title="English"
            >
              English
            </button>
            <button
              type="button"
              className={`access-lang-btn${language === 'hi' ? ' active' : ''}`}
              onClick={() => setLanguage('hi')}
              aria-label="Switch to Hindi"
              title="हिंदी"
            >
              हिंदी
            </button>
          </div>
        </div>
      </div>

      {/* ── Official Site Header ──────────────────────────────────── */}
      <header className="site-header" role="banner">
        <button
          type="button"
          className="mobile-toggle"
          onClick={onToggleMobileMenu}
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        <div className="site-header-logo">
          <img src="/logo.png" alt="ARGUS Logo" className="site-header-logo-img" />
          <div className="site-header-brand">
            <span className="site-header-brand-name">{t('brandTitle')}</span>
            <span className="site-header-brand-sub">{t('brandSubtitle')}</span>
          </div>
        </div>

        <div className="site-header-pills" role="status" aria-live="polite">
          {/* Live API status pill */}
          <span 
            className={`header-pill ${isBackendConnected ? 'online' : ''}`} 
            title={isBackendConnected ? 'Connected to FastAPI REST backend' : 'Local fallback'}
          >
            {isBackendConnected ? '● Live API' : '○ Standalone'}
          </span>

          {/* Role Switcher as pill select */}
          <label htmlFor="role-select" className="header-pill header-pill-role" title="Switch user role">
            <span>{t('role')}:</span>
            <select
              id="role-select"
              className="header-pill-role-select"
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as RoleType)}
              aria-label="Switch user role"
            >
              {ALL_ROLES.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </label>

          {authUser && (
            <div className="auth-user-chip" title={`${authUser.fullName} • ${authUser.email}`}>
              <div className="auth-user-avatar">
                {authUser.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <span className="auth-user-name">
                {authUser.fullName}
              </span>
              {onSignOut && (
                <button
                  id="topbar-signout-btn"
                  className="auth-signout-btn"
                  onClick={onSignOut}
                  title={t('signOut')}
                  aria-label={t('signOut')}
                >
                  ↩
                </button>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
};

// Export screen meta for page content breadcrumbs (supports optional translator)
export const getScreenMeta = (
  screen: ScreenType,
  selectedCaseId?: string | null,
  t?: (key: keyof Translations) => string
) => {
  if (t) {
    switch (screen) {
      case 'overview':     return { crumb: t('navOverview'),     title: t('overviewTitle'),     desc: t('overviewDesc') };
      case 'applications': return { crumb: t('navApplications'), title: t('applicationsTitle'), desc: t('applicationsDesc') };
      case 'regional':     return { crumb: t('navRegional'),     title: t('regionalTitle'),     desc: t('regionalDesc') };
      case 'case':         return { crumb: `${t('navApplications')} / ${selectedCaseId || 'Detail'}`, title: t('caseTitle'), desc: t('caseDesc') };
      case 'compliance':   return { crumb: t('navCompliance'),   title: t('complianceTitle'),   desc: t('complianceDesc') };
      case 'evc':          return { crumb: t('navEvc'),          title: t('evcTitle'),          desc: t('evcDesc') };
      case 'documents':    return { crumb: t('navDocuments'),    title: t('documentsTitle'),    desc: t('documentsDesc') };
      case 'alerts':       return { crumb: t('navAlerts'),       title: t('alertsTitle'),       desc: t('alertsDesc') };
      case 'audit':        return { crumb: t('navAudit'),        title: t('auditTitle'),        desc: t('auditDesc') };
      case 'rules':        return { crumb: t('navRules'),        title: t('rulesTitle'),        desc: t('rulesDesc') };
    }
  }

  // English fallback if t is not provided
  switch (screen) {
    case 'overview':     return { crumb: 'Overview',        title: 'Approval operations',                       desc: `Pending approval stages, statutory deadlines, EVC queues and escalations.` };
    case 'applications': return { crumb: 'Applications',    title: 'Case management',                           desc: 'All active applications sorted by statutory priority.' };
    case 'regional':     return { crumb: 'Regional desk',    title: 'Regional Office review & endorsement',      desc: 'Regional dossier inspection, compliance verification, and statutory recommendations.' };
    case 'case':         return { crumb: `Applications / ${selectedCaseId || 'Detail'}`, title: 'Case progression & scrutiny', desc: 'Full lifecycle dossier and scrutiny worksheet.' };
    case 'compliance':   return { crumb: 'Compliance',      title: 'Institutional obligations & undertakings',  desc: 'Statutory compliance obligations due for verification.' };
    case 'evc':          return { crumb: 'EVC desk',        title: 'Expert Visit Committee operations',         desc: 'Scheduling and reporting for on-site committee visits.' };
    case 'documents':    return { crumb: 'Documents',       title: 'Institutional document register',           desc: 'Authenticated uploaded documents with validity tracking.' };
    case 'alerts':       return { crumb: 'Alerts',          title: 'Escalation & alert management',             desc: 'Regulatory alerts triggered by the automation engine.' };
    case 'audit':        return { crumb: 'Audit trail',     title: 'Immutable regulatory event stream',         desc: 'Non-repudiable chronological log of all system actions.' };
    case 'rules':        return { crumb: 'Automation rules',title: 'Workflow policy & threshold configuration', desc: 'Configure thresholds and automation rule parameters.' };
  }
};
