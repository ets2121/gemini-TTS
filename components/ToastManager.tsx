'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  X,
  RefreshCw,
  Zap,
} from 'lucide-react';

export type ToastType = 'error' | 'warning' | 'info' | 'success' | 'rate-limit';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  retryDelaySec?: number;
  actionLabel?: string;
  onAction?: () => void;
  timestamp: number;
}

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id' | 'timestamp'>) => string;
  removeToast: (id: string) => void;
  showRateLimitToast: (retryDelaySec?: number, fallbackUsed?: boolean) => void;
  showErrorToast: (title: string, message: string) => void;
  showSuccessToast: (title: string, message: string) => void;
  showWarningToast: (title: string, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toastData: Omit<ToastMessage, 'id' | 'timestamp'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastMessage = {
        ...toastData,
        id,
        timestamp: Date.now(),
      };

      setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // Keep max 5 toasts

      // Auto dismiss after duration unless it's a critical rate-limit modal
      const autoDismissDuration =
        toastData.type === 'rate-limit'
          ? 9000
          : toastData.type === 'error'
          ? 7000
          : 4500;

      setTimeout(() => {
        removeToast(id);
      }, autoDismissDuration);

      return id;
    },
    [removeToast]
  );

  const showRateLimitToast = useCallback(
    (retryDelaySec?: number, fallbackUsed = true) => {
      addToast({
        type: 'rate-limit',
        title: 'Gemini Rate Limit (Quota 429)',
        message: fallbackUsed
          ? `Gemini TTS free-tier daily quota limit was reached. Real-time acoustic & device vocal synthesis was automatically activated so your audio stays playable.${
              retryDelaySec ? ` Quota refreshes in ~${retryDelaySec}s.` : ''
            }`
          : `API request limit reached.${
              retryDelaySec ? ` Please retry in ~${retryDelaySec}s.` : ''
            }`,
        retryDelaySec,
      });
    },
    [addToast]
  );

  const showErrorToast = useCallback(
    (title: string, message: string) => {
      addToast({
        type: 'error',
        title,
        message,
      });
    },
    [addToast]
  );

  const showSuccessToast = useCallback(
    (title: string, message: string) => {
      addToast({
        type: 'success',
        title,
        message,
      });
    },
    [addToast]
  );

  const showWarningToast = useCallback(
    (title: string, message: string) => {
      addToast({
        type: 'warning',
        title,
        message,
      });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        showRateLimitToast,
        showErrorToast,
        showSuccessToast,
        showWarningToast,
      }}
    >
      {children}

      {/* Floating Toast Notification Container */}
      <div
        id="toast-notification-container"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm sm:max-w-md w-full px-3 pointer-events-none"
      >
        {toasts.map((toast) => {
          const isRateLimit = toast.type === 'rate-limit';
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              id={`toast-item-${toast.id}`}
              className={`pointer-events-auto rounded-xl p-3.5 shadow-2xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-5 ${
                isRateLimit
                  ? 'bg-[#18120B]/95 border-amber-500/60 text-amber-100 shadow-amber-950/50 ring-1 ring-amber-500/30'
                  : isError
                  ? 'bg-[#1A0D0F]/95 border-rose-600/70 text-rose-100 shadow-rose-950/50 ring-1 ring-rose-500/30'
                  : isSuccess
                  ? 'bg-[#0D1A14]/95 border-teal-500/60 text-teal-100 shadow-teal-950/50'
                  : isWarning
                  ? 'bg-[#1A180E]/95 border-yellow-500/60 text-yellow-100 shadow-yellow-950/50'
                  : 'bg-[#12121A]/95 border-sky-500/60 text-sky-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  {isRateLimit && (
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <Zap className="w-3.5 h-3.5 fill-amber-400" />
                    </div>
                  )}
                  {isError && (
                    <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                      <XCircle className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {isSuccess && (
                    <div className="w-6 h-6 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {isWarning && (
                    <div className="w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {!isRateLimit && !isError && !isSuccess && !isWarning && (
                    <div className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                      <Info className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-xs font-bold ${
                        isRateLimit
                          ? 'text-amber-300'
                          : isError
                          ? 'text-rose-300'
                          : isSuccess
                          ? 'text-teal-300'
                          : isWarning
                          ? 'text-yellow-300'
                          : 'text-sky-300'
                      }`}
                    >
                      {toast.title}
                    </h4>

                    {isRateLimit && toast.retryDelaySec && (
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300">
                        {toast.retryDelaySec}s cooldown
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] mt-1 text-gray-300 leading-relaxed font-normal">
                    {toast.message}
                  </p>

                  {toast.actionLabel && toast.onAction && (
                    <button
                      type="button"
                      onClick={() => {
                        toast.onAction?.();
                        removeToast(toast.id);
                      }}
                      className="mt-2 text-[10px] font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-700/50 hover:bg-amber-900/60 transition"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>{toast.actionLabel}</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="shrink-0 text-gray-400 hover:text-gray-200 p-1 rounded-md transition hover:bg-white/5"
                  title="Close notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
