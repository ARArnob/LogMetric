"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { generateMockLog, isDemoMode, LogEntry, subscribeToLogStream } from "../lib/api";
import { useAuth } from "../lib/auth";
import { liveTailPausedStore } from "../lib/liveTail";
import { SEVERITY_ORDER, severityStyle } from "../lib/severity";
import { useServiceAliases } from "../lib/serviceAliases";
import LogDetailDrawer from "./explorer/LogDetailDrawer";
import {
  AlertCircle,
  Info,
  AlertTriangle,
  Activity,
  Bug,
  RefreshCw,
  Search,
  Download,
  Pause,
  Play,
  X,
  ArrowUp,
} from "lucide-react";

const LEVEL_ICON: Record<string, React.ReactNode> = {
  ERROR: <AlertCircle className="w-3 h-3" />,
  WARN: <AlertTriangle className="w-3 h-3" />,
  INFO: <Info className="w-3 h-3" />,
  DEBUG: <Bug className="w-3 h-3" />,
};

const SCROLL_TOP_THRESHOLD = 24;
const FLASH_MS = 1100;
// The live tail is a rolling window, not an archive -- Explorer is the tool
// for anything older. Kept as one named constant so the cap logic and the
// footer's disclosure of it can never drift apart.
const RETENTION_CAP = 200;

/**
 * Presentational live-tail view. Its `logs` come from the caller (dashboard
 * owns the one /logs/search request via useLogSearch) -- this component
 * only layers SSE push updates (or, in demo mode, a synthetic trickle) on
 * top so there's exactly one search request per refresh cycle, not two.
 */
export default function LogStream({
  logs: logsProp,
  loading,
  error,
  onRefresh,
}: {
  logs: LogEntry[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const { token } = useAuth();
  const { resolveServiceName } = useServiceAliases();
  const demoView = isDemoMode && !token;

  const [logs, setLogs] = useState<LogEntry[]>(logsProp);
  // Shared, not local -- CommandPalette can toggle this from any page.
  const paused = useSyncExternalStore(liveTailPausedStore.subscribe, liveTailPausedStore.get, () => false);
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  // Scroll-anchoring + pause buffering share one queue: while paused, or
  // while the user has scrolled away from the top to read something, new
  // arrivals accumulate here instead of shifting the visible rows.
  const containerRef = useRef<HTMLDivElement>(null);
  const atTopRef = useRef(true);
  const pausedRef = useRef(paused);
  const bufferRef = useRef<LogEntry[]>([]);
  const [bufferedCount, setBufferedCount] = useState(0);
  const rowRefs = useRef<Array<HTMLTableRowElement | null>>([]);

  useEffect(() => {
    pausedRef.current = paused;
    if (!paused && atTopRef.current) flushBuffer();
    // flushBuffer intentionally not in deps -- it closes over refs/setState only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  function flushBuffer() {
    if (bufferRef.current.length === 0) return;
    const flushed = bufferRef.current;
    bufferRef.current = [];
    setBufferedCount(0);
    setLogs((prev) => [...flushed, ...prev].slice(0, RETENTION_CAP));
    markFresh(flushed.map((l) => l.id));
  }

  function markFresh(ids: string[]) {
    setFreshIds((prev) => new Set([...prev, ...ids]));
    setTimeout(() => {
      setFreshIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }, FLASH_MS);
  }

  function receiveLog(log: LogEntry) {
    if (pausedRef.current || !atTopRef.current) {
      bufferRef.current = [log, ...bufferRef.current].slice(0, RETENTION_CAP - 1);
      setBufferedCount(bufferRef.current.length);
      return;
    }
    setLogs((prev) => [log, ...prev.slice(0, RETENTION_CAP - 1)]);
    markFresh([log.id]);
  }

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const nowAtTop = el.scrollTop < SCROLL_TOP_THRESHOLD;
    if (nowAtTop && !atTopRef.current && !pausedRef.current) {
      flushBuffer();
    }
    atTopRef.current = nowAtTop;
  }

  function jumpToTopAndFlush() {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    atTopRef.current = true;
    flushBuffer();
  }

  // Resync to the latest fetch from the parent -- unless paused, in which
  // case the displayed set intentionally holds still.
  useEffect(() => {
    if (paused) return;
    setLogs(logsProp);
  }, [logsProp, paused]);

  // Demo mode: synthesize a trickle of new rows, standing in for SSE.
  // Kept subscribed across pause changes -- receiveLog() decides whether to
  // merge or buffer, so pausing doesn't disconnect anything.
  useEffect(() => {
    if (!demoView) return;
    const id = setInterval(() => receiveLog(generateMockLog()), 1400);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoView]);

  // Real mode: org-scoped SSE live tail layered on top of the polled base.
  useEffect(() => {
    if (demoView) return;
    return subscribeToLogStream(receiveLog, (err) => console.error("Log stream error:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoView]);

  const counts = logs.reduce<Record<string, number>>((acc, l) => {
    const lv = l.level.toUpperCase();
    acc[lv] = (acc[lv] || 0) + 1;
    return acc;
  }, {});

  const displayed = logs.filter((l) => {
    if (filterLevel !== "ALL" && l.level.toUpperCase() !== filterLevel) return false;
    if (query) {
      const q = query.toLowerCase();
      return (
        l.message.toLowerCase().includes(q) ||
        l.serviceName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedIndex = selectedLogId ? displayed.findIndex((l) => l.id === selectedLogId) : -1;
  const selectedLog = selectedIndex >= 0 ? displayed[selectedIndex] : null;

  function openRow(idx: number) {
    setSelectedLogId(displayed[idx]?.id ?? null);
  }

  function navigateDrawer(direction: "prev" | "next") {
    const next = direction === "prev" ? selectedIndex - 1 : selectedIndex + 1;
    if (next >= 0 && next < displayed.length) setSelectedLogId(displayed[next].id);
  }

  function onRowKeyDown(e: React.KeyboardEvent<HTMLTableRowElement>, idx: number) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openRow(idx);
    } else if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      rowRefs.current[idx + 1]?.focus();
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      rowRefs.current[idx - 1]?.focus();
    }
  }

  function exportCsv() {
    const csv = [
      "timestamp,level,service,message,patternHash",
      ...displayed.map((l) =>
        [
          new Date(l.timestamp).toISOString(),
          l.level,
          l.serviceName,
          `"${l.message.replace(/"/g, '""')}"`,
          l.patternHash || "",
        ].join(",")
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `logmetric-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card card-sheen overflow-hidden">
      {/* Toolbar */}
      <div
        className="px-4 py-3 flex flex-wrap items-center gap-3"
        style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}
      >
        <div className="flex items-center gap-2 mr-1">
          <span
            className={error ? "" : "pulse-live"}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: error ? "var(--sev-error)" : "var(--ok)",
              display: "inline-block",
            }}
          />
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            Live stream
          </h2>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search
            className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter messages…"
            style={{ paddingLeft: 30, paddingTop: 6, paddingBottom: 6, fontSize: 13 }}
          />
        </div>

        {/* Level pills */}
        <div className="hidden md:flex items-center gap-1.5">
          {SEVERITY_ORDER.map((level) => {
            const cfg = severityStyle(level);
            const on = filterLevel === level;
            return (
              <button
                key={level}
                onClick={() => setFilterLevel(on ? "ALL" : level)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold transition-all"
                style={{
                  background: on ? cfg.dim : "transparent",
                  color: cfg.text,
                  border: `1px solid ${on ? cfg.color : "var(--border-subtle)"}`,
                  opacity: counts[level] ? 1 : 0.45,
                }}
              >
                {LEVEL_ICON[level]}
                {level}
                {counts[level] ? (
                  <span
                    className="px-1 rounded tabular-nums"
                    style={{ background: "var(--bg-overlay)", color: "var(--text-secondary)", fontSize: 9 }}
                  >
                    {counts[level]}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {(filterLevel !== "ALL" || query) && (
            <button
              onClick={() => {
                setFilterLevel("ALL");
                setQuery("");
              }}
              className="btn btn-quiet"
              style={{ padding: "6px 10px", fontSize: 12 }}
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
          <button
            onClick={() => liveTailPausedStore.set(!paused)}
            className="btn btn-ghost"
            style={{ padding: "6px 10px", fontSize: 12 }}
          >
            {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            {paused ? "Resume" : "Pause"}
          </button>
          <button onClick={onRefresh} className="btn btn-ghost" style={{ padding: 7 }} title="Refresh" aria-label="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={exportCsv} className="btn btn-ghost" style={{ padding: 7 }} title="Export CSV" aria-label="Export CSV">
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && !demoView && (
        <div
          className="px-4 py-2.5 flex items-center gap-2 text-sm"
          style={{
            background: "var(--sev-error-dim)",
            borderBottom: "1px solid var(--border-subtle)",
            color: "var(--sev-error)",
          }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="relative">
        {!paused && bufferedCount > 0 && (
          <button
            onClick={jumpToTopAndFlush}
            className="absolute left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg animate-fade-up"
            style={{ top: 10, background: "var(--accent)", color: "var(--accent-contrast)" }}
          >
            <ArrowUp className="w-3.5 h-3.5" />
            {bufferedCount} new event{bufferedCount === 1 ? "" : "s"}
          </button>
        )}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="overflow-x-auto"
          style={{ maxHeight: "56vh", overflowY: "auto" }}
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
              {loading && displayed.length === 0 ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((__, j) => (
                      <td key={j} className="px-4 py-2.5">
                        <div className="skeleton" style={{ height: 12 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center">
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {error && !demoView ? "Couldn't load logs." : "No events match the current filter."}
                    </p>
                    {(filterLevel !== "ALL" || query) && (
                      <button
                        onClick={() => {
                          setFilterLevel("ALL");
                          setQuery("");
                        }}
                        className="mt-3 text-xs underline"
                        style={{ color: "var(--accent)" }}
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                displayed.map((log, idx) => {
                  const cfg = severityStyle(log.level);
                  const ts = new Date(log.timestamp);
                  const isFresh = freshIds.has(log.id);
                  return (
                    <tr
                      key={log.id || `${log.timestamp}-${idx}`}
                      ref={(el) => {
                        rowRefs.current[idx] = el;
                      }}
                      tabIndex={0}
                      aria-label={`${log.level} log from ${resolveServiceName(log.serviceName)}: ${log.message}. Press Enter for details.`}
                      onClick={() => openRow(idx)}
                      onKeyDown={(e) => onRowKeyDown(e, idx)}
                      className={`log-row log-row-enter${isFresh ? " log-row-flash" : ""}`}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        animationDelay: `${Math.min(idx * 14, 300)}ms`,
                      }}
                    >
                      <td
                        className="px-4 py-2.5 font-mono whitespace-nowrap tabular-nums"
                        style={{ color: "var(--text-muted)", fontSize: 11 }}
                      >
                        {ts.toLocaleTimeString([], { hour12: false })}
                        <span style={{ opacity: 0.6 }}>
                          .{String(ts.getMilliseconds()).padStart(3, "0")}
                        </span>
                      </td>

                      <td className="px-4 py-2.5">
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase"
                          style={{ color: cfg.text, background: cfg.dim }}
                        >
                          {LEVEL_ICON[log.level?.toUpperCase()] ?? <Activity className="w-3 h-3" />}
                          {log.level}
                        </span>
                      </td>

                      <td
                        className="px-4 py-2.5 font-semibold whitespace-nowrap"
                        style={{ color: "var(--accent)", fontSize: 11 }}
                      >
                        {resolveServiceName(log.serviceName)}
                      </td>

                      <td
                        className="px-4 py-2.5 max-w-md truncate"
                        style={{ color: "var(--text-secondary)" }}
                        title={log.message}
                      >
                        {log.message}
                      </td>

                      <td
                        className="px-4 py-2.5 font-mono whitespace-nowrap"
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2.5 flex items-center justify-between text-xs"
        style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--bg-elevated)", color: "var(--text-muted)" }}
      >
        <span>
          <span className="font-semibold tabular-nums" style={{ color: "var(--text-secondary)" }}>
            {displayed.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold tabular-nums" style={{ color: "var(--text-secondary)" }}>
            {logs.length}
          </span>{" "}
          events
          {logs.length >= RETENTION_CAP && (
            <>
              {" "}
              <span title={`The live tail keeps only the newest ${RETENTION_CAP} events -- use Explorer to search further back.`}>
                · capped at {RETENTION_CAP}
              </span>
            </>
          )}
        </span>
        <span className="font-mono" style={{ fontSize: 10 }}>
          {paused ? (
            <span style={{ color: "var(--sev-warn)" }}>
              ❚❚ paused{bufferedCount > 0 ? ` · ${bufferedCount} event${bufferedCount === 1 ? "" : "s"} buffered` : ""}
            </span>
          ) : (
            <span style={{ color: "var(--ok-text)" }}>● streaming</span>
          )}
        </span>
      </div>

      <LogDetailDrawer
        log={selectedLog}
        onClose={() => setSelectedLogId(null)}
        onNavigate={navigateDrawer}
        hasPrev={selectedIndex > 0}
        hasNext={selectedIndex >= 0 && selectedIndex < displayed.length - 1}
      />
    </div>
  );
}
