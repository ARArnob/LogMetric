/**
 * Severity is STATUS data, not categorical -- these colors are fixed across
 * every theme so an ERROR reads as an error regardless of the surface.
 * Validated for CVD separation, normal-vision separation, and >=3:1 contrast
 * against all three theme surfaces. See globals.css for the full rationale.
 */

export const SEVERITY_ORDER = ["ERROR", "WARN", "INFO", "DEBUG"] as const;
export type Severity = (typeof SEVERITY_ORDER)[number];

/**
 * `color` is the validated FILL used for chart marks -- never change it per
 * theme. `text` is the legible variant for when severity is rendered as text
 * (badges, terminal rows); on dark surfaces the two are identical.
 */
export const SEVERITY: Record<
  Severity,
  { color: string; text: string; dim: string; label: string }
> = {
  ERROR: { color: "var(--sev-error)", text: "var(--sev-error-text)", dim: "var(--sev-error-dim)", label: "Error" },
  WARN: { color: "var(--sev-warn)", text: "var(--sev-warn-text)", dim: "var(--sev-warn-dim)", label: "Warn" },
  INFO: { color: "var(--sev-info)", text: "var(--sev-info-text)", dim: "var(--sev-info-dim)", label: "Info" },
  DEBUG: { color: "var(--sev-debug)", text: "var(--sev-debug-text)", dim: "var(--sev-debug-dim)", label: "Debug" },
};

export function severityOf(level: string): Severity | null {
  const up = level?.toUpperCase();
  return (SEVERITY_ORDER as readonly string[]).includes(up) ? (up as Severity) : null;
}

export function severityStyle(level: string) {
  const s = severityOf(level);
  return s
    ? SEVERITY[s]
    : {
        color: "var(--text-muted)",
        text: "var(--text-muted)",
        dim: "var(--sev-debug-dim)",
        label: level,
      };
}

/** 1284 -> "1,284"; 12934 -> "12.9K"; 4200000 -> "4.2M" */
export function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return n.toLocaleString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}
