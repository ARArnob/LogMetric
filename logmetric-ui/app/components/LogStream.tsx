"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { generateMockLog, isDemoMode, LogEntry, subscribeToLogStream } from "../lib/api";
import { useAuth } from "../lib/auth";
import { SEVERITY_ORDER, severityStyle } from "../lib/severity";
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
} from "lucide-react";

const LEVEL_ICON: Record<string, React.ReactNode> = {
  ERROR: <AlertCircle className="w-3 h-3" />,
  WARN: <AlertTriangle className="w-3 h-3" />,
  INFO: <Info className="w-3 h-3" />,
  DEBUG: <Bug className="w-3 h-3" />,
};

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
  const demoView = isDemoMode && !token;

  const [logs, setLogs] = useState<LogEntry[]>(logsProp);
  const [paused, setPaused] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [query, setQuery] = useState("");

  // Resync to the latest fetch from the parent -- unless paused, in which
  // case the displayed set intentionally holds still.
  useEffect(() => {
    if (paused) return;
    setLogs(logsProp);
  }, [logsProp, paused]);

  // Demo mode: synthesize a trickle of new rows, standing in for SSE.
  useEffect(() => {
    if (!demoView || paused) return;
    const id = setInterval(() => {
      setLogs((prev) => [generateMockLog(), ...prev.slice(0, 49)]);
    }, 1400);
    return () => clearInterval(id);
  }, [demoView, paused]);

  // Real mode: org-scoped SSE live tail layered on top of the polled base.
  useEffect(() => {
    if (demoView || paused) return;
    return subscribeToLogStream(
      (log) => setLogs((prev) => [log, ...prev.slice(0, 199)]),
      (err) => console.error("Log stream error:", err)
    );
  }, [demoView, paused]);

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
            onClick={() => setPaused((p) => !p)}
            className="btn btn-ghost"
            style={{ padding: "6px 10px", fontSize: 12 }}
          >
            {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            {paused ? "Resume" : "Pause"}
          </button>
          <button onClick={onRefresh} className="btn btn-ghost" style={{ padding: 7 }} title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={exportCsv} className="btn btn-ghost" style={{ padding: 7 }} title="Export CSV">
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
      <div className="overflow-x-auto" style={{ maxHeight: "56vh", overflowY: "auto" }}>
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
                return (
                  <tr
                    key={log.id || `${log.timestamp}-${idx}`}
                    className="log-row-enter"
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      animationDelay: `${Math.min(idx * 14, 300)}ms`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
                      {log.serviceName}
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
        </span>
        <span className="font-mono" style={{ fontSize: 10 }}>
          {paused ? (
            <span style={{ color: "var(--sev-warn)" }}>❚❚ paused</span>
          ) : (
            <span style={{ color: "var(--ok)" }}>● streaming</span>
          )}
        </span>
      </div>
    </div>
  );
}
