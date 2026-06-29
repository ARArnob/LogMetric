"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchLogs, generateMockLog, LogEntry } from "../lib/api";
import {
  AlertCircle,
  Info,
  AlertTriangle,
  Activity,
  Bug,
  RefreshCw,
  Filter,
  Download,
  Pause,
  Play,
} from "lucide-react";

const LEVEL_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string; label: string }
> = {
  ERROR: {
    icon: <AlertCircle className="w-3 h-3" />,
    color: "var(--error)",
    bg: "var(--error-dim)",
    label: "ERROR",
  },
  WARN: {
    icon: <AlertTriangle className="w-3 h-3" />,
    color: "var(--warn)",
    bg: "var(--warn-dim)",
    label: "WARN",
  },
  INFO: {
    icon: <Info className="w-3 h-3" />,
    color: "var(--info)",
    bg: "var(--info-dim)",
    label: "INFO",
  },
  DEBUG: {
    icon: <Bug className="w-3 h-3" />,
    color: "var(--text-muted)",
    bg: "rgba(77,87,105,0.15)",
    label: "DEBUG",
  },
};

function getLevelConfig(level: string) {
  return (
    LEVEL_CONFIG[level.toUpperCase()] ?? {
      icon: <Activity className="w-3 h-3" />,
      color: "var(--text-muted)",
      bg: "rgba(77,87,105,0.15)",
      label: level,
    }
  );
}

export default function LogStream() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [isDemo, setIsDemo] = useState(false);

  // Counts per level
  const counts = logs.reduce(
    (acc, l) => {
      const lv = l.level.toUpperCase();
      acc[lv] = (acc[lv] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const loadLogs = useCallback(async () => {
    if (paused) return;
    try {
      const data = await fetchLogs(filterLevel !== "ALL" ? filterLevel : undefined);
      setLogs(data);
      setError(null);

      // Detect if we're in demo mode by checking if IDs start with 'mock-'
      if (data.length > 0 && data[0].id.startsWith("mock-")) {
        setIsDemo(true);
      } else {
        setIsDemo(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch logs";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [paused, filterLevel]);

  // Simulate live updates when in demo mode
  useEffect(() => {
    if (!isDemo || paused) return;
    const interval = setInterval(() => {
      setLogs((prev) => {
        const newLog = generateMockLog();
        return [newLog, ...prev.slice(0, 49)];
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [isDemo, paused]);

  useEffect(() => {
    setLoading(true);
    loadLogs();
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, [loadLogs]);

  const displayed =
    filterLevel === "ALL"
      ? logs
      : logs.filter((l) => l.level.toUpperCase() === filterLevel);

  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-4"
        style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}
      >
        {/* Status + title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {error ? (
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "var(--error)" }}
              />
            ) : (
              <span
                className="w-2 h-2 rounded-full pulse-live"
                style={{ background: "var(--accent-green)" }}
              />
            )}
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              Live Data Stream
            </span>
          </div>
          {isDemo && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full tracking-widest uppercase"
              style={{
                background: "rgba(255,179,71,0.12)",
                color: "var(--warn)",
                border: "1px solid rgba(255,179,71,0.2)",
              }}
            >
              DEMO MODE
            </span>
          )}
        </div>

        {/* Stats pills */}
        <div className="hidden sm:flex items-center gap-2">
          {(["ERROR", "WARN", "INFO", "DEBUG"] as const).map((level) => {
            const cfg = getLevelConfig(level);
            return (
              <button
                key={level}
                onClick={() => setFilterLevel(filterLevel === level ? "ALL" : level)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all"
                style={{
                  background: filterLevel === level ? cfg.bg : "transparent",
                  color: cfg.color,
                  border: `1px solid ${filterLevel === level ? cfg.color : "transparent"}`,
                  opacity: counts[level] ? 1 : 0.4,
                }}
              >
                {cfg.icon}
                {level}
                {counts[level] ? (
                  <span
                    className="px-1 py-0.5 rounded text-[9px] font-black"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    {counts[level]}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {filterLevel !== "ALL" && (
            <button
              onClick={() => setFilterLevel("ALL")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                color: "var(--accent-cyan)",
                border: "1px solid var(--accent-cyan-dim)",
                background: "var(--accent-cyan-dim)",
              }}
            >
              <Filter className="w-3 h-3" />
              Clear filter
            </button>
          )}
          <button
            onClick={() => setPaused((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
            style={{
              background: paused ? "var(--accent-cyan-dim)" : "var(--bg-overlay)",
              color: paused ? "var(--accent-cyan)" : "var(--text-secondary)",
              border: "1px solid var(--border-default)",
            }}
          >
            {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={loadLogs}
            className="p-1.5 rounded-md transition-all"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1.5 rounded-md transition-all"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}
            title="Export logs"
            onClick={() => {
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
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `logmetric-export-${Date.now()}.csv`;
              a.click();
            }}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto" style={{ maxHeight: "60vh", overflowY: "auto" }}>
        <table className="w-full text-left text-xs" style={{ borderCollapse: "collapse" }}>
          <thead className="sticky top-0" style={{ background: "var(--bg-elevated)", zIndex: 10 }}>
            <tr>
              {["Timestamp", "Level", "Service", "Message", "Pattern Hash"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 font-bold tracking-widest uppercase text-[10px]"
                  style={{
                    color: "var(--text-muted)",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && displayed.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-16 text-center font-mono text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  <div className="flex items-center justify-center gap-3">
                    <Activity
                      className="w-4 h-4 animate-spin"
                      style={{ color: "var(--accent-cyan)" }}
                    />
                    Initializing log stream...
                  </div>
                </td>
              </tr>
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    No logs match the current filter.
                  </p>
                  <button
                    onClick={() => setFilterLevel("ALL")}
                    className="mt-3 text-xs underline"
                    style={{ color: "var(--accent-cyan)" }}
                  >
                    Clear filter
                  </button>
                </td>
              </tr>
            ) : (
              displayed.map((log, idx) => {
                const cfg = getLevelConfig(log.level);
                const ts = new Date(log.timestamp);
                return (
                  <tr
                    key={log.id || log.timestamp}
                    className="log-row-enter group transition-colors"
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                      animationDelay: `${Math.min(idx * 20, 400)}ms`,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-elevated)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)")
                    }
                  >
                    {/* Timestamp */}
                    <td className="px-4 py-3 font-mono whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                      <span style={{ color: "var(--text-secondary)", fontSize: "10px" }}>
                        {ts.toLocaleDateString([], { month: "2-digit", day: "2-digit" })}{" "}
                      </span>
                      <span style={{ fontSize: "11px" }}>
                        {ts.toLocaleTimeString([], { hour12: false })}
                      </span>
                      <span style={{ color: "var(--text-muted)", fontSize: "9px" }}>
                        .{String(ts.getMilliseconds()).padStart(3, "0")}
                      </span>
                    </td>

                    {/* Level badge */}
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase"
                        style={{ color: cfg.color, background: cfg.bg }}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </td>

                    {/* Service */}
                    <td
                      className="px-4 py-3 font-semibold whitespace-nowrap text-[11px]"
                      style={{ color: "var(--accent-cyan)" }}
                    >
                      {log.serviceName}
                    </td>

                    {/* Message */}
                    <td
                      className="px-4 py-3 max-w-sm truncate"
                      style={{ color: "var(--text-secondary)" }}
                      title={log.message}
                    >
                      {log.message}
                    </td>

                    {/* Pattern hash */}
                    <td className="px-4 py-3 font-mono whitespace-nowrap" style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                      {log.patternHash ? (
                        <span
                          className="px-2 py-0.5 rounded"
                          style={{ background: "var(--bg-overlay)" }}
                        >
                          {log.patternHash.substring(0, 8)}
                        </span>
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

      {/* Footer bar */}
      <div
        className="px-5 py-3 flex items-center justify-between border-t text-xs"
        style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
      >
        <span>
          Showing{" "}
          <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{displayed.length}</span>{" "}
          of <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{logs.length}</span> events
        </span>
        <span className="font-mono" style={{ fontSize: "10px" }}>
          {paused ? (
            <span style={{ color: "var(--warn)" }}>⏸ Stream paused</span>
          ) : (
            <span style={{ color: "var(--accent-green)" }}>● Streaming live</span>
          )}
        </span>
      </div>
    </div>
  );
}
