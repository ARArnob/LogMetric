import { ReactNode } from "react";

const VARIANT = {
  neutral: { bg: "var(--bg-inset)", color: "var(--text-muted)" },
  accent: { bg: "var(--accent-dim)", color: "var(--accent)" },
  ok: { bg: "var(--ok-dim)", color: "var(--ok-text)" },
  error: { bg: "var(--sev-error-dim)", color: "var(--sev-error-text)" },
  warn: { bg: "var(--sev-warn-dim)", color: "var(--sev-warn-text)" },
} as const;

export default function Badge({
  children,
  variant = "neutral",
}: {
  children: ReactNode;
  variant?: keyof typeof VARIANT;
}) {
  const v = VARIANT[variant];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
      style={{ background: v.bg, color: v.color }}
    >
      {children}
    </span>
  );
}
