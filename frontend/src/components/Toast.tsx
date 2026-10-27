import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'warning' | 'info';
  duration?: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const DEFAULT_TOAST_DURATION = 3500;

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duration = toast.duration ?? DEFAULT_TOAST_DURATION;

  const triggerDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 250);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      triggerDismiss();
    }, duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [duration, triggerDismiss]);

  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (!isExiting) {
      timerRef.current = setTimeout(() => {
        triggerDismiss();
      }, 1500);
    }
  };

  const iconColor =
    toast.type === 'warning'
      ? '#fcd34d'
      : toast.type === 'info'
      ? '#93c5fd'
      : '#d4f458';

  return (
    <div
      className={`toast ${isExiting ? 'is-exiting' : ''} toast-${toast.type || 'success'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="alert"
    >
      {toast.type === 'warning' ? (
        <AlertTriangle size={18} color={iconColor} style={{ flexShrink: 0 }} />
      ) : toast.type === 'info' ? (
        <Info size={18} color={iconColor} style={{ flexShrink: 0 }} />
      ) : (
        <CheckCircle2 size={18} color={iconColor} style={{ flexShrink: 0 }} />
      )}
      <span className="toast-message" style={{ flex: 1 }}>
        {toast.message}
      </span>
      <button
        type="button"
        className="modal-close-btn"
        onClick={triggerDismiss}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
      <div
        className="toast-progress-bar"
        style={{
          backgroundColor: iconColor,
          animationDuration: `${duration}ms`,
        }}
      />
    </div>
  );
};

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
