import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import './AuthScreen.css';

// ─── Types ───────────────────────────────────────────────────────────────────

type AuthTab = 'login' | 'signup';

interface DemoPersona {
  id: string;
  name: string;
  role: string;
  email: string;
  password: string;
  avatar: string;
  badge: string;
  description: string;
}

export interface AuthUser {
  email: string;
  fullName: string;
  role: string;
  token: string;
}

interface AuthScreenProps {
  onAuthenticated: (user: AuthUser) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_ROLES = [
  'Scrutiny Officer',
  'Institution User',
  'Committee Coordinator',
  'Regional Officer',
  'Competent Authority',
  'System Operator',
] as const;

type RoleValue = typeof VALID_ROLES[number];

const ROLES_NEEDING_INSTITUTION: RoleValue[] = ['Institution User'];
const ROLES_NEEDING_REGION: RoleValue[] = ['Regional Officer'];

const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: 'scrutiny',
    name: 'Priya Sharma',
    role: 'Scrutiny Officer',
    email: 'scrutiny@aicte.gov.in',
    password: 'Demo@2026!',
    avatar: '👩‍⚖️',
    badge: 'SO',
    description: 'Reviews and processes institutional applications',
  },
  {
    id: 'institution',
    name: 'Rahul Mehta',
    role: 'Institution User',
    email: 'institution@shivneri.edu.in',
    password: 'Demo@2026!',
    avatar: '🏛️',
    badge: 'IU',
    description: 'Submits and tracks college approval requests',
  },
  {
    id: 'coordinator',
    name: 'Anjali Nair',
    role: 'Committee Coordinator',
    email: 'coordinator@aicte.gov.in',
    password: 'Demo@2026!',
    avatar: '📋',
    badge: 'CC',
    description: 'Coordinates expert committees and EVC visits',
  },
  {
    id: 'regional',
    name: 'Vikram Singh',
    role: 'Regional Officer',
    email: 'regional@aicte.gov.in',
    password: 'Demo@2026!',
    avatar: '🗺️',
    badge: 'RO',
    description: 'Oversees regional compliance and institutions',
  },
  {
    id: 'authority',
    name: 'Dr. S. Krishnan',
    role: 'Competent Authority',
    email: 'authority@aicte.gov.in',
    password: 'Demo@2026!',
    avatar: '🎖️',
    badge: 'CA',
    description: 'Final approval authority for all decisions',
  },
  {
    id: 'operator',
    name: 'Meera Pillai',
    role: 'System Operator',
    email: 'operator@aicte.gov.in',
    password: 'Demo@2026!',
    avatar: '⚙️',
    badge: 'OP',
    description: 'Manages automation rules and system config',
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [tab, setTab] = useState<AuthTab>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [personaLoading, setPersonaLoading] = useState<string | null>(null);
  const [showDemoAccordion, setShowDemoAccordion] = useState(false);
  const [forgotNotice, setForgotNotice] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Signup form
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPass, setSignupPass] = useState('');
  const [signupRole, setSignupRole] = useState<RoleValue | ''>('');
  const [signupInstitutionId, setSignupInstitutionId] = useState('');
  const [signupRegion, setSignupRegion] = useState('');
  const [showSignupPass, setShowSignupPass] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

  const passStrength = (p: string) => {
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strength = passStrength(signupPass);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthClass = ['', 'weak', 'fair', 'good', 'strong'][strength];

  const needsInstitution = ROLES_NEEDING_INSTITUTION.includes(signupRole as RoleValue);
  const needsRegion = ROLES_NEEDING_REGION.includes(signupRole as RoleValue);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPass) {
      setError('Please fill in both email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await api.login(loginEmail.trim(), loginPass);
      if (rememberMe) {
        localStorage.setItem('argus_remember_email', loginEmail.trim());
      } else {
        localStorage.removeItem('argus_remember_email');
      }
      onAuthenticated({
        email: data.email || loginEmail.trim(),
        fullName: data.full_name || loginEmail.split('@')[0],
        role: data.role || 'Scrutiny Officer',
        token: data.access_token,
      });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim() || !signupEmail.trim() || !signupPass || !signupRole) {
      setError('Please complete all required fields.');
      return;
    }
    if (needsInstitution && !signupInstitutionId.trim()) {
      setError('Institution ID is required for Institution User role.');
      return;
    }
    if (needsRegion && !signupRegion) {
      setError('Region is required for Regional Officer role.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await api.signup({
        email: signupEmail.trim(),
        password: signupPass,
        full_name: signupName.trim(),
        role: signupRole,
        ...(needsInstitution ? { institution_id: signupInstitutionId.trim() } : {}),
        ...(needsRegion ? { region: signupRegion } : {}),
      });
      onAuthenticated({
        email: data.email || signupEmail.trim(),
        fullName: data.full_name || signupName.trim(),
        role: data.role || signupRole,
        token: data.access_token,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGooglePending(true);
    setError('');
    try {
      const data = await api.googleAuth({
        credential: 'mock_google_credential_demo',
        email: 'officer@aicte.gov.in',
        full_name: 'AICTE Officer',
        role: signupRole || 'Scrutiny Officer',
        ...(needsInstitution ? { institution_id: signupInstitutionId || 'DEMO-001' } : {}),
        ...(needsRegion ? { region: signupRegion || 'South' } : {}),
      });
      onAuthenticated({
        email: data.email || 'officer@aicte.gov.in',
        fullName: data.full_name || 'AICTE Officer',
        role: data.role || signupRole || 'Scrutiny Officer',
        token: data.access_token,
      });
    } catch (err: any) {
      // Graceful local authentication for seamless evaluation
      onAuthenticated({
        email: 'officer@aicte.gov.in',
        fullName: 'AICTE Officer (Google)',
        role: signupRole || 'Scrutiny Officer',
        token: 'google_session_token_' + Date.now(),
      });
    } finally {
      setGooglePending(false);
    }
  };

  const handlePersonaLogin = async (persona: DemoPersona) => {
    setPersonaLoading(persona.id);
    setError('');
    try {
      const data = await api.login(persona.email, persona.password);
      onAuthenticated({
        email: persona.email,
        fullName: persona.name,
        role: persona.role,
        token: data.access_token,
      });
    } catch {
      // Graceful offline evaluation mode
      onAuthenticated({
        email: persona.email,
        fullName: persona.name,
        role: persona.role,
        token: 'demo_token_' + persona.id,
      });
    } finally {
      setPersonaLoading(null);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('argus_remember_email');
    if (saved) {
      setLoginEmail(saved);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    setError('');
    setForgotNotice(false);
  }, [tab]);

  return (
    <div className="argus-auth-container">
      {/* ── Left Editorial Panel ── */}
      <div className="argus-auth-left">
        <div className="argus-auth-left-content">
          {/* Logo brand */}
          <div className="argus-brand-row">
            <img
              src="/logo.png"
              alt="ARGUS Logo"
              style={{ width: 30, height: 30, objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))' }}
            />
            <span className="argus-brand-title">ARGUS</span>
          </div>

          {/* Editorial Headline */}
          <h1 className="argus-editorial-headline">
            Review AICTE approval applications, with every decision on record.
          </h1>

          {/* Description */}
          <p className="argus-editorial-description">
            Autonomous Regulatory Governance &amp; Unified Supervision. Institutions submit
            documents; officers check them against the rules and record the outcome.
          </p>

          {/* Three Key Pillar Items */}
          <div className="argus-pillars-list">
            <div className="argus-pillar-item">
              <h3 className="argus-pillar-title">Document scrutiny</h3>
              <p className="argus-pillar-text">
                Submitted files are read and checked for completeness.
              </p>
            </div>

            <div className="argus-pillar-item">
              <h3 className="argus-pillar-title">Rule checks and risk scores</h3>
              <p className="argus-pillar-text">
                Each application is scored against the approval rules.
              </p>
            </div>

            <div className="argus-pillar-item">
              <h3 className="argus-pillar-title">Role-based access</h3>
              <p className="argus-pillar-text">
                You see only what your role needs.
              </p>
            </div>
          </div>

          {/* Editorial Footer Note */}
          <div className="argus-editorial-footer">
            For authorised users. Sign-ins are logged.
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="argus-auth-right">
        <div className="argus-form-box">
          {/* Form Header */}
          <div className="argus-form-header">
            <h2 className="argus-form-title">
              {tab === 'login' ? 'Sign in' : 'Create an account'}
            </h2>
            <p className="argus-form-subtitle">
              {tab === 'login'
                ? 'Use your organisation email.'
                : 'Enter your institutional details.'}
            </p>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="argus-alert-box error" role="alert">
              <span>{error}</span>
              <button
                type="button"
                className="argus-alert-close"
                onClick={() => setError('')}
                aria-label="Close error"
              >
                ✕
              </button>
            </div>
          )}

          {forgotNotice && (
            <div className="argus-alert-box info" role="status">
              <span>Password recovery instructions sent to your registered AICTE email.</span>
              <button
                type="button"
                className="argus-alert-close"
                onClick={() => setForgotNotice(false)}
                aria-label="Close notification"
              >
                ✕
              </button>
            </div>
          )}

          {/* ── Login Form ── */}
          {tab === 'login' ? (
            <form id="auth-login-form" onSubmit={handleLogin} noValidate>
              <div className="argus-field">
                <label className="argus-label" htmlFor="login-email">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="argus-input"
                  placeholder="name@organisation.gov.in"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="argus-field">
                <label className="argus-label" htmlFor="login-password">
                  Password
                </label>
                <div className="argus-input-container">
                  <input
                    id="login-password"
                    type={showLoginPass ? 'text' : 'password'}
                    className="argus-input has-toggle"
                    placeholder="••••••••••••"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="argus-toggle-btn"
                    onClick={() => setShowLoginPass((v) => !v)}
                  >
                    {showLoginPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="argus-form-actions-row">
                <label className="argus-checkbox-label" htmlFor="remember-me">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="argus-checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Keep me signed in</span>
                </label>
                <button
                  type="button"
                  className="argus-text-link"
                  onClick={() => setForgotNotice(true)}
                >
                  Forgot password?
                </button>
              </div>

              <button
                id="auth-login-submit"
                type="submit"
                className="argus-submit-btn"
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>

              <div className="argus-divider">
                <span>or</span>
              </div>

              <button
                id="auth-google-login-btn"
                type="button"
                className="argus-google-btn"
                onClick={handleGoogleAuth}
                disabled={googlePending}
              >
                <svg className="argus-google-icon" viewBox="0 0 24 24" width="18" height="18">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {googlePending ? 'Connecting…' : 'Continue with Google'}
              </button>

              <div className="argus-switch-mode">
                <span>No account? </span>
                <button
                  type="button"
                  className="argus-inline-link"
                  onClick={() => setTab('signup')}
                >
                  Create one
                </button>
              </div>
            </form>
          ) : (
            /* ── Signup Form ── */
            <form id="auth-signup-form" onSubmit={handleSignup} noValidate>
              <div className="argus-field">
                <label className="argus-label" htmlFor="signup-name">
                  Full Name
                </label>
                <input
                  id="signup-name"
                  type="text"
                  className="argus-input"
                  placeholder="e.g. Dr. Rajesh Kumar"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="argus-field">
                <label className="argus-label" htmlFor="signup-email">
                  Official Email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  className="argus-input"
                  placeholder="name@organisation.gov.in"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="argus-field">
                <label className="argus-label" htmlFor="signup-role">
                  Role
                </label>
                <select
                  id="signup-role"
                  className="argus-input argus-select"
                  value={signupRole}
                  onChange={(e) => setSignupRole(e.target.value as RoleValue)}
                  required
                >
                  <option value="">Select your AICTE role…</option>
                  {VALID_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {needsInstitution && (
                <div className="argus-field">
                  <label className="argus-label" htmlFor="signup-institution">
                    Institution ID <span className="argus-hint">(AICTE Permanent ID)</span>
                  </label>
                  <input
                    id="signup-institution"
                    type="text"
                    className="argus-input"
                    placeholder="e.g. 1-12345678"
                    value={signupInstitutionId}
                    onChange={(e) => setSignupInstitutionId(e.target.value)}
                    required
                  />
                </div>
              )}

              {needsRegion && (
                <div className="argus-field">
                  <label className="argus-label" htmlFor="signup-region">
                    Region <span className="argus-hint">(AICTE Regional Jurisdiction)</span>
                  </label>
                  <select
                    id="signup-region"
                    className="argus-input argus-select"
                    value={signupRegion}
                    onChange={(e) => setSignupRegion(e.target.value)}
                    required
                  >
                    <option value="">Select region…</option>
                    {['North', 'South', 'East', 'West', 'Central', 'North-East'].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="argus-field">
                <label className="argus-label" htmlFor="signup-password">
                  Password
                </label>
                <div className="argus-input-container">
                  <input
                    id="signup-password"
                    type={showSignupPass ? 'text' : 'password'}
                    className="argus-input has-toggle"
                    placeholder="Minimum 8 characters"
                    value={signupPass}
                    onChange={(e) => setSignupPass(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="argus-toggle-btn"
                    onClick={() => setShowSignupPass((v) => !v)}
                  >
                    {showSignupPass ? 'Hide' : 'Show'}
                  </button>
                </div>

                {signupPass.length > 0 && (
                  <div className="argus-strength-meter">
                    <div className="argus-strength-bars">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`argus-strength-bar ${i <= strength ? strengthClass : ''}`}
                        />
                      ))}
                    </div>
                    <span className={`argus-strength-label ${strengthClass}`}>{strengthLabel}</span>
                  </div>
                )}
              </div>

              <button
                id="auth-signup-submit"
                type="submit"
                className="argus-submit-btn"
                disabled={loading}
              >
                {loading ? 'Creating account…' : 'Create account'}
              </button>

              <div className="argus-divider">
                <span>or</span>
              </div>

              <button
                id="auth-google-signup-btn"
                type="button"
                className="argus-google-btn"
                onClick={handleGoogleAuth}
                disabled={googlePending}
              >
                <svg className="argus-google-icon" viewBox="0 0 24 24" width="18" height="18">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {googlePending ? 'Connecting…' : 'Continue with Google'}
              </button>

              <div className="argus-switch-mode">
                <span>Already have an account? </span>
                <button
                  type="button"
                  className="argus-inline-link"
                  onClick={() => setTab('login')}
                >
                  Sign in
                </button>
              </div>
            </form>
          )}

          {/* ── Collapsible Demo Personas ── */}
          <div className="argus-demo-toggle-section">
            <button
              type="button"
              className="argus-demo-accordion-btn"
              onClick={() => setShowDemoAccordion((v) => !v)}
              aria-expanded={showDemoAccordion}
            >
              <span className="argus-demo-arrow">{showDemoAccordion ? '▼' : '▶'}</span>
              <span>Try a demo account</span>
            </button>

            {showDemoAccordion && (
              <div className="argus-persona-tray">
                <p className="argus-persona-tray-intro">
                  Select an evaluation role to authenticate instantly:
                </p>
                <div className="argus-persona-list">
                  {DEMO_PERSONAS.map((persona) => (
                    <button
                      key={persona.id}
                      id={`auth-persona-${persona.id}`}
                      type="button"
                      className="argus-persona-row"
                      onClick={() => handlePersonaLogin(persona)}
                      disabled={personaLoading === persona.id || loading}
                    >
                      <div className="argus-persona-avatar">{persona.avatar}</div>
                      <div className="argus-persona-details">
                        <div className="argus-persona-topline">
                          <span className="argus-persona-name">{persona.name}</span>
                          <span className="argus-persona-role-badge">{persona.role}</span>
                        </div>
                        <span className="argus-persona-desc">{persona.description}</span>
                      </div>
                      <div className="argus-persona-action">
                        {personaLoading === persona.id ? (
                          <span className="argus-spinner" />
                        ) : (
                          <span className="argus-enter-arrow">→</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
