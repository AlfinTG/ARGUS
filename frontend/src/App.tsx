import { useState, useEffect, useCallback } from 'react';
import './components/components.css';
import { useApp } from './context/AppContext';
import { useLanguage } from './context/LanguageContext';
import { Sidebar } from './components/Sidebar';
import { Topbar, getScreenMeta } from './components/Topbar';
import { Toast } from './components/Toast';
import type { ToastMessage } from './components/Toast';
import {
  ROLE_PERMITTED_SCREENS,
  ROLE_DEFAULT_SCREEN,
  ALL_ROLES
} from './types';
import type { ScreenType, NavCounts, RoleType } from './types';
import { OverviewScreen } from './screens/OverviewScreen';
import { ApplicationsScreen } from './screens/ApplicationsScreen';
import { CaseDetailScreen } from './screens/CaseDetailScreen';
import { ComplianceScreen } from './screens/ComplianceScreen';
import { EVCDeskScreen } from './screens/EVCDeskScreen';
import { DocumentsScreen } from './screens/DocumentsScreen';
import { AlertsScreen } from './screens/AlertsScreen';
import { AuditTrailScreen } from './screens/AuditTrailScreen';
import { RulesConsoleScreen } from './screens/RulesConsoleScreen';
import { SplashScreen } from './components/SplashScreen';
import { AuthScreen } from './screens/AuthScreen';
import type { AuthUser } from './screens/AuthScreen';
import { setAuthToken } from './api/client';

const AUTH_STORAGE_KEY = 'argus_auth_user';

function App() {
  const { state, setRole, isBackendConnected } = useApp();
  const { t } = useLanguage();
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // ── Toast notifications ──────────────────────────────────────────────
  const addToast = useCallback((message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    const newToast: ToastMessage = {
      id: String(Date.now() + Math.random()),
      message,
      type,
    };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Splash + Auth state ─────────────────────────────────────────────
  const [splashDone, setSplashDone] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Restore JWT token and sync context role on initial mount
  useEffect(() => {
    if (authUser?.token) {
      setAuthToken(authUser.token);
    }
    if (authUser?.role && ALL_ROLES.includes(authUser.role as RoleType)) {
      const role = authUser.role as RoleType;
      setRole(role);
      const allowed = ROLE_PERMITTED_SCREENS[role] || ['overview'];
      if (!allowed.includes(currentScreen)) {
        setCurrentScreen(ROLE_DEFAULT_SCREEN[role] || 'overview');
      }
    }
  }, []);

  const handleAuthenticated = useCallback((user: AuthUser) => {
    setAuthUser(user);
    setAuthToken(user.token);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // localStorage fallback
    }

    // Synchronize AppContext role & automatically redirect to role's default landing screen
    const userRole = user.role as RoleType;
    if (ALL_ROLES.includes(userRole)) {
      setRole(userRole);
      const defaultScreen = ROLE_DEFAULT_SCREEN[userRole] || 'overview';
      setCurrentScreen(defaultScreen);
    }

    addToast(`Signed in as ${user.fullName} (${user.role})`, 'success');
  }, [setRole, addToast]);

  const handleSignOut = useCallback(() => {
    setAuthUser(null);
    setAuthToken(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }
    setCurrentScreen('overview');
    addToast('Signed out successfully.', 'info');
  }, [addToast]);

  // ── Role-based Access Control: Automatic Redirection ────────────────
  useEffect(() => {
    const activeRole = state.role;
    const allowed = ROLE_PERMITTED_SCREENS[activeRole] || ['overview'];
    if (!allowed.includes(currentScreen)) {
      const targetScreen = ROLE_DEFAULT_SCREEN[activeRole] || 'overview';
      setCurrentScreen(targetScreen);
      addToast(`Screen "${currentScreen}" is restricted for ${activeRole}. Redirected to ${targetScreen}.`, 'warning');
    }
  }, [state.role, currentScreen, addToast]);

  // Compute live navigation counts
  const navCounts: NavCounts = {
    applications: state.apps.filter((a) => !['Closed', 'Rejected'].includes(a.status)).length,
    alerts: state.alerts.filter((a) => a.status === 'Open').length,
    evc: state.evcs.filter((e) => e.status !== 'Completed').length,
    compliance: state.compliance.filter((c) => c.verification !== 'Verified').length,
    documents: state.docs.filter((d) => d.reviewStatus !== 'Verified').length,
  };

  // Show splash screen on first load
  if (!splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  // Show auth screen if not authenticated
  if (!authUser) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  const isPermitted = (ROLE_PERMITTED_SCREENS[state.role] || ['overview']).includes(currentScreen);
  const meta = getScreenMeta(currentScreen, state.selectedAppId, t);

  return (
    <div className="app-shell">
      {/* Accessibility bar + Site header */}
      <Topbar
        currentScreen={currentScreen}
        selectedCaseId={state.selectedAppId}
        currentRole={state.role}
        onRoleChange={(role) => {
          setRole(role);
          if (authUser) {
            const updatedUser = { ...authUser, role };
            setAuthUser(updatedUser);
            try {
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
            } catch {
              // ignore
            }
          }
          addToast(`Role switched to: ${role}`, 'info');
        }}
        simulationDate={state.simDate}
        isBackendConnected={isBackendConnected}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        authUser={authUser}
        onSignOut={handleSignOut}
      />

      {/* Body: sidebar + main content */}
      <div className="app-body">
        <Sidebar
          currentScreen={currentScreen}
          onNavigate={setCurrentScreen}
          counts={navCounts}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          userRole={state.role}
        />

        <div className="main-wrapper">
          <main id="main-content" className="page-container" tabIndex={-1}>
            {/* Breadcrumb */}
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <span>{t('home')}</span>
              <span className="crumb-sep">›</span>
              <span className="current">{meta.crumb}</span>
            </nav>

            {/* Page header */}
            <div className="page-header">
              <div>
                <h1>{meta.title}</h1>
                <p>{meta.desc}</p>
              </div>
              {/* Screen-level actions are rendered within each screen component */}
            </div>

            {!isPermitted ? (
              <div
                style={{
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  margin: '2rem auto',
                  maxWidth: 520,
                  background: 'var(--bg-white)',
                  border: '1px solid var(--red-border)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🛡️</div>
                <h3 style={{ marginBottom: '0.75rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                  Access Restricted
                </h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem', lineHeight: '1.6' }}>
                  Your active role (<strong>{state.role}</strong>) does not have access to the{' '}
                  <strong>{currentScreen}</strong> module.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setCurrentScreen(ROLE_DEFAULT_SCREEN[state.role] || 'overview')}
                >
                  Go to {ROLE_DEFAULT_SCREEN[state.role] || 'Overview'}
                </button>
              </div>
            ) : (
              <>
                {currentScreen === 'overview' && (
                  <OverviewScreen onNavigate={setCurrentScreen} onToast={addToast} />
                )}
                {currentScreen === 'applications' && (
                  <ApplicationsScreen onNavigate={setCurrentScreen} onToast={addToast} />
                )}
                {currentScreen === 'case' && (
                  <CaseDetailScreen onNavigate={setCurrentScreen} onToast={addToast} />
                )}
                {currentScreen === 'compliance' && (
                  <ComplianceScreen onNavigate={setCurrentScreen} onToast={addToast} />
                )}
                {currentScreen === 'evc' && (
                  <EVCDeskScreen onNavigate={setCurrentScreen} onToast={addToast} />
                )}
                {currentScreen === 'documents' && (
                  <DocumentsScreen onNavigate={setCurrentScreen} onToast={addToast} />
                )}
                {currentScreen === 'alerts' && (
                  <AlertsScreen onNavigate={setCurrentScreen} onToast={addToast} />
                )}
                {currentScreen === 'audit' && (
                  <AuditTrailScreen onNavigate={setCurrentScreen} onToast={addToast} />
                )}
                {currentScreen === 'rules' && (
                  <RulesConsoleScreen onNavigate={setCurrentScreen} onToast={addToast} />
                )}
              </>
            )}
          </main>

          {/* Footer */}
          <footer className="site-footer" role="contentinfo">
            <span>{t('footerCopyright')}</span>
            <div className="site-footer-links">
              <a href="#accessibility">{t('footerAccessibility')}</a>
              <div className="site-footer-sep" />
              <a href="#privacy">{t('footerPrivacy')}</a>
              <div className="site-footer-sep" />
              <a href="#terms">{t('footerTerms')}</a>
              <div className="site-footer-sep" />
              <a href="#contact">{t('footerContact')}</a>
              <div className="site-footer-sep" />
              <a href="#help">{t('footerHelp')}</a>
            </div>
          </footer>
        </div>
      </div>

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
