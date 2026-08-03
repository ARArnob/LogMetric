"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, Info, Activity, Bug } from "lucide-react";
import { LogEntry } from "../../lib/api";
import { severityStyle } from "../../lib/severity";
import { useServiceAliases } from "../../lib/serviceAliases";

const LEVEL_ICON: Record<string, React.ReactNode> = {
  ERROR: <AlertCircle className="w-3 h-3" />,
  WARN: <AlertTriangle className="w-3 h-3" />,
  INFO: <Info className="w-3 h-3" />,
  DEBUG: <Bug className="w-3 h-3" />,
};

// Above this many rows, render only what's near the viewport instead of the
// whole table -- a plain (unvirtualized) 1,000-row table visibly drops
// scroll framerate. Disabled under `wrap` since wrapped messages make row
// height variable, which a fixed-row-height windowing scheme can't track.
const VIRTUALIZE_THRESHOLD = 200;
const OVERSCAN_ROWS = 12;

export default function LogTable({
  logs,
  loading,
  density,
  wrap,
  onRowClick,
  selectedId,
}: {
  logs: LogEntry[];
  loading: boolean;
  density: "comfortable" | "compact";
  wrap: boolean;
  onRowClick: (log: LogEntry, index: number) => void;
  selectedId?: string | null;
}) {
  const { resolveServiceName } = useServiceAliases();
  const rowPad = density === "compact" ? "py-1" : "py-2.5";
  const rowHeight = density === "compact" ? 29 : 41;

  const virtualize = !wrap && logs.length > VIRTUALIZE_THRESHOLD;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);

  useEffect(() => {
    if (!virtualize) return;
    const el = scrollRef.current;
    if (!el) return;
    setViewportH(el.clientHeight);
    setScrollTop(el.scrollTop);
  }, [virtualize]);

  const startIdx = virtualize ? Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN_ROWS) : 0;
  const endIdx = virtualize
    ? Math.min(logs.length, Math.ceil((scrollTop + viewportH) / rowHeight) + OVERSCAN_ROWS)
    : logs.length;
  const visibleLogs = virtualize ? logs.slice(startIdx, endIdx) : logs;
  const topSpacer = virtualize ? startIdx * rowHeight : 0;
  const bottomSpacer = virtualize ? (logs.length - endIdx) * rowHeight : 0;

  return (
    <div
      ref={scrollRef}
      onScroll={virtualize ? (e) => setScrollTop(e.currentTarget.scrollTop) : undefined}
      className="overflow-x-auto"
      style={virtualize ? { maxHeight: "70vh", overflowY: "auto" } : undefined}
    >
      <table className="w-full text-left text-xs" style={{ borderCollapse: "collapse" }}>
        <thead className="sticky top-0" style={{ background: "var(--bg-elevated)", zIndex: 10 }}>
          <tr>
            {["Time", "Level", "Service", "Message", "Pattern"].map((h) => (
              <th
                key={h}
                className="px-4 py-2.5 font-bold tracking-wider uppercase text-[10px]"
                style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-subtle)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? [...Array(8)].map((_, i) => (
                <tr key={i}>
                  {[...Array(5)].map((__, j) => (
                    <td key={j} className={`px-4 ${rowPad}`}>
                      <div className="skeleton" style={{ height: 12 }} />
                    </td>
                  ))}
                </tr>
              ))
            : (
              <>
                {topSpacer > 0 && (
                  <tr aria-hidden="true" style={{ height: topSpacer }}>
                    <td colSpan={5} style={{ padding: 0, border: 0 }} />
                  </tr>
                )}
                {visibleLogs.map((log, i) => {
                const idx = startIdx + i;
                const cfg = severityStyle(log.level);
                const ts = new Date(log.timestamp);
                const selected = selectedId === log.id;
                return (
                  <tr
                    key={log.id || `${log.timestamp}-${idx}`}
                    tabIndex={0}
                    onClick={() => onRowClick(log, idx)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(log, idx);
                      }
                    }}
                    className="log-row-enter cursor-pointer"
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      background: selected ? "var(--accent-dim)" : "transparent",
                      animationDelay: `${Math.min(idx * 10, 200)}ms`,
                    }}
                    onMouseEnter={(e) => {
                      if (!selected) e.currentTarget.style.background = "var(--bg-elevated)";
                    }}
                    onMouseLeave={(e) => {
                      if (!selected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <td
                      className={`px-4 ${rowPad} font-mono whitespace-nowrap tabular-nums`}
                      style={{ color: "var(--text-muted)", fontSize: 11 }}
                    >
                      {ts.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                    </td>

                    <td className={`px-4 ${rowPad}`}>
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase"
                        style={{ color: cfg.text, background: cfg.dim }}
                      >
                        {LEVEL_ICON[log.level?.toUpperCase()] ?? <Activity className="w-3 h-3" />}
                        {log.level}
                      </span>
                    </td>

                    <td
                      className={`px-4 ${rowPad} font-semibold whitespace-nowrap`}
                      style={{ color: "var(--accent)", fontSize: 11 }}
                    >
                      {resolveServiceName(log.serviceName)}
                    </td>

                    <td
                      className={`px-4 ${rowPad} ${wrap ? "max-w-md whitespace-normal break-words" : "max-w-md truncate"}`}
                      style={{ color: "var(--text-secondary)" }}
                      title={wrap ? undefined : log.message}
                    >
                      {log.message}
                    </td>

                    <td
                      className={`px-4 ${rowPad} font-mono whitespace-nowrap`}
                      style={{ color: "var(--text-muted)", fontSize: 10 }}
                    >
                      {log.patternHash ? (
                        <Link
                          href={`/patterns?hash=${encodeURIComponent(log.patternHash)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-1.5 py-0.5 rounded transition-colors"
                          style={{ background: "var(--bg-inset)", textDecoration: "none" }}
                          title="View this pattern"
                        >
                          {log.patternHash.substring(0, 8)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
                })}
                {bottomSpacer > 0 && (
                  <tr aria-hidden="true" style={{ height: bottomSpacer }}>
                    <td colSpan={5} style={{ padding: 0, border: 0 }} />
                  </tr>
                )}
              </>
            )}
        </tbody>
      </table>
    </div>
  );
}
