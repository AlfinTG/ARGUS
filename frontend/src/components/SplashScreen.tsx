import React, { useEffect, useState, useCallback } from 'react';
import './SplashScreen.css';

interface SplashScreenProps {
  onFinish: () => void;
  durationMs?: number;
}

const TELEMETRY_STEPS = [
  'Initializing security credentials...',
  'Verifying AICTE statutory schema...',
  'Arming regulatory rules engine (WF-01 to DOC-01)...',
  'Synchronizing case workflow telemetry...',
  'ARGUS Platform Ready.',
];

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 2400,
}) => {
  const [progress, setProgress] = useState(10);
  const [stepIndex, setStepIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onFinish();
    }, 550);
  }, [isExiting, onFinish]);

  // Telemetry and progress increment
  useEffect(() => {
    const stepIntervalMs = Math.floor(durationMs / TELEMETRY_STEPS.length);
    const progressIntervalMs = 50;
    const progressStep = 100 / (durationMs / progressIntervalMs);

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + progressStep;
        return next >= 100 ? 100 : next;
      });
    }, progressIntervalMs);

    const textTimer = setInterval(() => {
      setStepIndex((prev) => {
        if (prev < TELEMETRY_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, stepIntervalMs);

    const finishTimer = setTimeout(() => {
      handleDismiss();
    }, durationMs);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(progressTimer);
      clearInterval(textTimer);
      clearTimeout(finishTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [durationMs, handleDismiss]);

  return (
    <div className={`splash-overlay ${isExiting ? 'splash-exit' : ''}`} role="dialog" aria-modal="true">
      <div className="splash-grid" />
      <div className="splash-glow-orb" />

      {/* Official AICTE Shield Emblem Logo */}
      <div className="splash-emblem-wrap">
        <img
          src="/logo.png"
          alt="ARGUS Shield Logo"
          className="splash-logo-img"
        />
      </div>

      {/* Brand Title & Subtitle */}
      <h1 className="splash-brand-title">
        ARG<span className="brand-accent">US</span>
      </h1>
      <div className="splash-subtitle">
        AICTE Approval &amp; Compliance Intelligence Platform
      </div>

      <div className="splash-badge">
        <span className="splash-badge-dot" />
        <span>Complete Visibility · Accountable Governance</span>
      </div>

      {/* Telemetry Progress Track & Label */}
      <div className="splash-telemetry-box">
        <div className="splash-progress-track">
          <div
            className="splash-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="splash-status-text">
          <span>▸</span>
          <span>{TELEMETRY_STEPS[stepIndex]}</span>
        </div>
      </div>

      {/* Quick Skip Button */}
      <button
        type="button"
        className="splash-skip-btn"
        onClick={handleDismiss}
        aria-label="Enter portal"
      >
        Enter Portal (ESC)
      </button>
    </div>
  );
};
