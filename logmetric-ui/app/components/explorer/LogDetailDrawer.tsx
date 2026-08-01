"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, Activity, Bug, Info, ChevronUp, ChevronDown, GitBranch, Search } from "lucide-react";
import Drawer from "../ui/Drawer";
import CopyButton from "../ui/CopyButton";
import { LogEntry } from "../../lib/api";
import { severityStyle } from "../../lib/severity";

const LEVEL_ICON: Record<string, React.ReactNode> = {
  ERROR: <AlertCircle className="w-3.5 h-3.5" />,
  WARN: <AlertTriangle className="w-3.5 h-3.5" />,
  INFO: <Info className="w-3.5 h-3.5" />,
  DEBUG: <Bug className="w-3.5 h-3.5" />,
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.round(diffMs / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="text-sm font-mono break-all" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );
}

/**
 * Opened from any log row -- Explorer and the dashboard stream both use
 * this. j/k or the arrow keys move between logs without closing the
 * drawer, which is what makes triage feel like a fast loop rather than a
 * click-open-close cycle per row.
 */
export default function LogDetailDrawer({
  log,
  onClose,
  onNavigate,
  hasPrev = false,
  hasNext = false,
}: {
  log: LogEntry | null;
  onClose: () => void;
  onNavigate?: (direction: "prev" | "next") => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}) {
  useEffect(() => {
    if (!log || !onNavigate) return;
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if ((e.key === "ArrowUp" || e.key === "k") && hasPrev) {
        e.preventDefault();
        onNavigate!("prev");
      } else if ((e.key === "ArrowDown" || e.key === "j") && hasNext) {
        e.preventDefault();
        onNavigate!("next");
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [log, onNavigate, hasPrev, hasNext]);

  const cfg = log ? severityStyle(log.level) : null;
  const ts = log ? new Date(log.timestamp) : null;

  return (
    <Drawer open={!!log} onClose={onClose} title="Log details" width={460}>
      {log && cfg && ts && (
      <div className="flex flex-col gap-5">
        {/* Header: level + service + nav hint */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-extrabold tracking-wider uppercase"
              style={{ color: cfg.text, background: cfg.dim }}
            >
              {LEVEL_ICON[log.level?.toUpperCase()] ?? <Activity className="w-3.5 h-3.5" />}
              {log.level}
            </span>
            <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
              {log.serviceName}
            </span>
          </div>
          {onNavigate && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onNavigate("prev")}
                disabled={!hasPrev}
                className="btn btn-quiet"
                style={{ padding: 5 }}
                aria-label="Previous log"
                title="Previous (k / ↑)"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNavigate("next")}
                disabled={!hasNext}
                className="btn btn-quiet"
                style={{ padding: 5 }}
                aria-label="Next log"
                title="Next (j / ↓)"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Message -- full, wrapped, selectable */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Message
          </span>
          <pre
            className="mt-1 text-[13px] leading-relaxed whitespace-pre-wrap break-words font-mono p-3 rounded-lg"
            style={{ background: "var(--bg-inset)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}
          >
            {log.message}
          </pre>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Timestamp" value={`${ts.toLocaleString()} (${relativeTime(log.timestamp)})`} />
          <Field label="Log ID" value={log.id} />
          {log.systemId && <Field label="System" value={log.systemId} />}
          {log.userId && <Field label="User" value={log.userId} />}
          {log.patternHash && <Field label="Pattern hash" value={log.patternHash} />}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <CopyButton value={JSON.stringify(log, null, 2)} label="Copy as JSON" />
          {log.patternHash && (
            <>
              <Link href={`/patterns?hash=${encodeURIComponent(log.patternHash)}`} className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>
                <GitBranch className="w-3.5 h-3.5" />
                View this pattern
              </Link>
              <Link
                href={`/explorer?patternHash=${encodeURIComponent(log.patternHash)}`}
                className="btn btn-ghost"
                style={{ padding: "6px 12px", fontSize: 12 }}
              >
                <Search className="w-3.5 h-3.5" />
                Find similar
              </Link>
            </>
          )}
        </div>
      </div>
      )}
    </Drawer>
  );
}
