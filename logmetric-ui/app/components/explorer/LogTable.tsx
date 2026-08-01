"use client";

import { AlertCircle, AlertTriangle, Info, Activity, Bug } from "lucide-react";
import { LogEntry } from "../../lib/api";
import { severityStyle } from "../../lib/severity";

const LEVEL_ICON: Record<string, React.ReactNode> = {
  ERROR: <AlertCircle className="w-3 h-3" />,
  WARN: <AlertTriangle className="w-3 h-3" />,
  INFO: <Info className="w-3 h-3" />,
  DEBUG: <Bug className="w-3 h-3" />,
};

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
  const rowPad = density === "compact" ? "py-1" : "py-2.5";

  return (
    <div className="overflow-x-auto">
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
            : logs.map((log, idx) => {
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
                      {log.serviceName}
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
                        <span className="px-1.5 py-0.5 rounded" style={{ background: "var(--bg-inset)" }}>
                          {log.patternHash.substring(0, 8)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}
