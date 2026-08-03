"use client";

import { useEffect, useState } from "react";
import { BellRing, Radio } from "lucide-react";
import EmptyState from "../ui/EmptyState";
import { AlertEvent, subscribeToAlertStream } from "../../lib/api";

const RETENTION_CAP = 50;

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

/**
 * Any org member can see this fire, not just admins -- GET /api/alerts/stream
 * has no ADMIN gate, same as the log stream. Rule management is admin-only;
 * watching alerts land is not.
 */
export default function LiveAlertFeed() {
  const [events, setEvents] = useState<Array<AlertEvent & { receivedAt: number }>>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAlertStream(
      (event) => {
        setConnected(true);
        setEvents((prev) => [{ ...event, receivedAt: Date.now() }, ...prev].slice(0, RETENTION_CAP));
      },
      () => setConnected(false)
    );
    setConnected(true);
    return unsubscribe;
  }, []);

  return (
    <div className="card p-0 overflow-hidden">
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Radio className="w-3.5 h-3.5" style={{ color: connected ? "var(--ok)" : "var(--text-muted)" }} />
          Live feed
        </h2>
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {connected ? "connected" : "reconnecting…"} · capped at {RETENTION_CAP}
        </span>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<BellRing className="w-6 h-6" />}
          title="No alerts yet"
          description="When an enabled rule's condition is met, it appears here in real time -- and by email, if it has recipients."
        />
      ) : (
        <ul>
          {events.map((event, i) => (
            <li
              key={`${event.ruleId}-${event.triggeredAt}-${i}`}
              className="px-5 py-3 flex items-start gap-3 log-row-enter"
              style={i < events.length - 1 ? { borderBottom: "1px solid var(--border-subtle)" } : undefined}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "var(--sev-error-dim)", color: "var(--sev-error-text)" }}
              >
                <BellRing className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                  {event.ruleName}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {event.detail}
                </div>
              </div>
              <div className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                {relativeTime(event.triggeredAt)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
