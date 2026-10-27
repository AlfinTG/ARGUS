import React from 'react';
import { ROLE_PERMITTED_SCREENS } from '../types';
import type { ScreenType, NavCounts, RoleType } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface SidebarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  counts: NavCounts;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  userRole?: RoleType;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  counts,
  isOpenMobile,
  onCloseMobile,
  userRole = 'Scrutiny Officer',
}) => {
  const { t } = useLanguage();

  const handleNav = (screen: ScreenType) => {
    onNavigate(screen);
    onCloseMobile();
  };

  const isScreenActive = (screen: ScreenType) => {
    if (currentScreen === 'case' && screen === 'applications') return true;
    return currentScreen === screen;
  };

  const permitted = ROLE_PERMITTED_SCREENS[userRole] || ['overview'];
  const canAccess = (screen: ScreenType) => permitted.includes(screen);

  return (
    <aside
      className={`sidebar ${isOpenMobile ? 'open' : ''}`}
      aria-label="Main navigation"
      id="site-navigation"
    >
      <div className="nav-section-label">{t('navOperations')}</div>
      <nav className="nav-group" aria-label={t('navOperations')}>
        {canAccess('overview') && (
          <button
            type="button"
            className={`nav-item ${isScreenActive('overview') ? 'active' : ''}`}
            onClick={() => handleNav('overview')}
            aria-current={isScreenActive('overview') ? 'page' : undefined}
          >
            <span className="nav-item-label">{t('navOverview')}</span>
          </button>
        )}

        {canAccess('applications') && (
          <button
            type="button"
            className={`nav-item ${isScreenActive('applications') ? 'active' : ''}`}
            onClick={() => handleNav('applications')}
            aria-current={isScreenActive('applications') ? 'page' : undefined}
          >
            <span className="nav-item-label">{t('navApplications')}</span>
            {counts.applications > 0 && (
              <span className="nav-badge" aria-label={`${counts.applications} open`}>
                {counts.applications}
              </span>
            )}
          </button>
        )}

        {canAccess('compliance') && (
          <button
            type="button"
            className={`nav-item ${isScreenActive('compliance') ? 'active' : ''}`}
            onClick={() => handleNav('compliance')}
            aria-current={isScreenActive('compliance') ? 'page' : undefined}
          >
            <span className="nav-item-label">{t('navCompliance')}</span>
            {counts.compliance > 0 && (
              <span className="nav-badge" aria-label={`${counts.compliance} pending`}>
                {counts.compliance}
              </span>
            )}
          </button>
        )}

        {canAccess('evc') && (
          <button
            type="button"
            className={`nav-item ${isScreenActive('evc') ? 'active' : ''}`}
            onClick={() => handleNav('evc')}
            aria-current={isScreenActive('evc') ? 'page' : undefined}
          >
            <span className="nav-item-label">{t('navEvc')}</span>
            {counts.evc > 0 && (
              <span className="nav-badge" aria-label={`${counts.evc} open`}>
                {counts.evc}
              </span>
            )}
          </button>
        )}

        {canAccess('documents') && (
          <button
            type="button"
            className={`nav-item ${isScreenActive('documents') ? 'active' : ''}`}
            onClick={() => handleNav('documents')}
            aria-current={isScreenActive('documents') ? 'page' : undefined}
          >
            <span className="nav-item-label">{t('navDocuments')}</span>
            {counts.documents > 0 && (
              <span className="nav-badge" aria-label={`${counts.documents} unverified`}>
                {counts.documents}
              </span>
            )}
          </button>
        )}

        {canAccess('alerts') && (
          <button
            type="button"
            className={`nav-item ${isScreenActive('alerts') ? 'active' : ''}`}
            onClick={() => handleNav('alerts')}
            aria-current={isScreenActive('alerts') ? 'page' : undefined}
          >
            <span className="nav-item-label">{t('navAlerts')}</span>
            {counts.alerts > 0 && (
              <span className="nav-badge" aria-label={`${counts.alerts} open`}>
                {counts.alerts}
              </span>
            )}
          </button>
        )}

        {canAccess('audit') && (
          <button
            type="button"
            className={`nav-item ${isScreenActive('audit') ? 'active' : ''}`}
            onClick={() => handleNav('audit')}
            aria-current={isScreenActive('audit') ? 'page' : undefined}
          >
            <span className="nav-item-label">{t('navAudit')}</span>
          </button>
        )}
      </nav>

      {canAccess('rules') && (
        <>
          <div className="nav-section-label">{t('navConfig')}</div>
          <nav className="nav-group" aria-label={t('navConfig')}>
            <button
              type="button"
              className={`nav-item ${isScreenActive('rules') ? 'active' : ''}`}
              onClick={() => handleNav('rules')}
              aria-current={isScreenActive('rules') ? 'page' : undefined}
            >
              <span className="nav-item-label">{t('navRules')}</span>
            </button>
          </nav>
        </>
      )}

      <div className="sidebar-footer">
        <div className="sidebar-footer-heading">{t('helpdeskTitle')}</div>
        <div>
          helpdesk@aicte-india.org<br />
          {t('helpdeskPhone')}<br />
          {t('helpdeskHours')}
        </div>
        <div style={{ marginTop: 8, color: 'var(--text-faint)', fontSize: 10.5 }}>
          AICTE ARGUS v1.0
        </div>
      </div>
    </aside>
  );
};
