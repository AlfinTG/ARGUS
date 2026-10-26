import { useState } from 'react';
import './components/components.css';
import { useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Toast } from './components/Toast';
import type { ToastMessage } from './components/Toast';
import type { ScreenType, NavCounts } from './types';
import { OverviewScreen } from './screens/OverviewScreen';
import { ApplicationsScreen } from './screens/ApplicationsScreen';
import { CaseDetailScreen } from './screens/CaseDetailScreen';
import { ComplianceScreen } from './screens/ComplianceScreen';
import { EVCDeskScreen } from './screens/EVCDeskScreen';
import { DocumentsScreen } from './screens/DocumentsScreen';
import { AlertsScreen } from './screens/AlertsScreen';
import { AuditTrailScreen } from './screens/AuditTrailScreen';
import { RulesConsoleScreen } from './screens/RulesConsoleScreen';

function App() {
  const { state, setRole, isBackendConnected } = useApp();
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    const newToast: ToastMessage = {
      id: String(Date.now() + Math.random()),
      message,
      type,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Compute live navigation counts
  const navCounts: NavCounts = {
    applications: state.apps.filter((a) => !['Closed', 'Rejected'].includes(a.status)).length,
    alerts: state.alerts.filter((a) => a.status === 'Open').length,
    evc: state.evcs.filter((e) => e.status !== 'Completed').length,
    compliance: state.compliance.filter((c) => c.verification !== 'Verified').length,
    documents: state.docs.filter((d) => d.reviewStatus !== 'Verified').length,
  };

  return (
    <div className="app-shell">
      <Sidebar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        counts={navCounts}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <div className="main-wrapper">
        <Topbar
          currentScreen={currentScreen}
          selectedCaseId={state.selectedAppId}
          currentRole={state.role}
          onRoleChange={(role) => {
            setRole(role);
            addToast(`Demo role switched to: ${role}`, 'info');
          }}
          simulationDate={state.simDate}
          isBackendConnected={isBackendConnected}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        <main className="page-container">
          <div className="demo-banner">
            <span>⚠</span>
            <div>
              <strong>Prototype simulation — not an official AICTE system</strong>
              All institutions and case records are synthetic. Rule thresholds are demo configuration only. Alerts do not send real email/SMS; role selection demonstrates behavior and is not production security.
            </div>
          </div>

          {currentScreen === 'overview' && (
            <OverviewScreen
              onNavigate={setCurrentScreen}
              onToast={addToast}
            />
          )}

          {currentScreen === 'applications' && (
            <ApplicationsScreen
              onNavigate={setCurrentScreen}
              onToast={addToast}
            />
          )}

          {currentScreen === 'case' && (
            <CaseDetailScreen
              onNavigate={setCurrentScreen}
              onToast={addToast}
            />
          )}

          {currentScreen === 'compliance' && (
            <ComplianceScreen
              onNavigate={setCurrentScreen}
              onToast={addToast}
            />
          )}

          {currentScreen === 'evc' && (
            <EVCDeskScreen
              onNavigate={setCurrentScreen}
              onToast={addToast}
            />
          )}

          {currentScreen === 'documents' && (
            <DocumentsScreen
              onNavigate={setCurrentScreen}
              onToast={addToast}
            />
          )}

          {currentScreen === 'alerts' && (
            <AlertsScreen
              onNavigate={setCurrentScreen}
              onToast={addToast}
            />
          )}

          {currentScreen === 'audit' && (
            <AuditTrailScreen
              onNavigate={setCurrentScreen}
              onToast={addToast}
            />
          )}

          {currentScreen === 'rules' && (
            <RulesConsoleScreen
              onNavigate={setCurrentScreen}
              onToast={addToast}
            />
          )}
        </main>
      </div>

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
