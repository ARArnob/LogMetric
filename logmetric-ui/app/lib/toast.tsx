"use client";

import { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// Errors linger longer -- they usually need to be read, not just noticed.
const DURATION_MS: Record<ToastType, number> = { success: 4000, info: 4000, error: 7000 };
const MAX_VISIBLE = 3;

const ICON: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const ACCENT: Record<ToastType, { color: string; dim: string }> = {
  success: { color: "var(--ok)", dim: "var(--ok-dim)" },
  error: { color: "var(--sev-error-text)", dim: "var(--sev-error-dim)" },
  info: { color: "var(--sev-info-text)", dim: "var(--sev-info-dim)" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = ++nextId.current;
      // Cap visible toasts by dropping the oldest rather than queueing --
      // a stack of stale notifications is worse than losing one.
      setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, type, message }]);
      setTimeout(() => dismiss(id), DURATION_MS[type]);
    },
    [dismiss]
  );

  const value: ToastContextValue = {
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed top-4 right-4 flex flex-col gap-2 pointer-events-none"
        style={{ zIndex: 100, width: "min(360px, calc(100vw - 32px))" }}
      >
        {toasts.map((t) => {
          const Icon = ICON[t.type];
          const accent = ACCENT[t.type];
          return (
            <div
              key={t.id}
              role="status"
              aria-live={t.type === "error" ? "assertive" : "polite"}
              className="card toast-enter pointer-events-auto flex items-start gap-2.5 p-3"
              style={{ boxShadow: "var(--shadow-lift)" }}
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                style={{ background: accent.dim, color: accent.color }}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <p className="flex-1 text-[13px] leading-snug pt-0.5" style={{ color: "var(--text-primary)" }}>
                {t.message}
              </p>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 p-0.5 rounded transition-colors"
                style={{ color: "var(--text-muted)" }}
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
