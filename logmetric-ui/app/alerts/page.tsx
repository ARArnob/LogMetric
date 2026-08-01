"use client";

import { BellRing, Activity, TrendingUp, Sparkles, Route } from "lucide-react";
import AppShell from "../components/AppShell";
import { useRequireAuth } from "../lib/auth";

const PLANNED = [
  {
    icon: TrendingUp,
    title: "Threshold rules",
    desc: "Trigger when a service's error rate crosses a limit you set, over a window you choose.",
  },
  {
    icon: Sparkles,
    title: "Anomaly notifications",
    desc: "Surface the same EMA and entropy signals the ingestion pipeline already computes.",
  },
  {
    icon: Route,
    title: "Routing",
    desc: "Send a rule's alerts to the people who own that service, not everyone in the org.",
  },
];

export default function AlertsPage() {
  const { loading } = useRequireAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg-base)", color: "var(--text-muted)" }}
      >
        <div className="flex items-center gap-3 text-sm">
          <Activity className="w-4 h-4 animate-spin" style={{ color: "var(--accent)" }} />
          Loading…
        </div>
      </div>
    );
  }

  return (
    <AppShell title="Alerts" description="Not built yet. Here's what's planned and why it isn't live.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {PLANNED.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card card-sheen p-5 animate-fade-up">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
              style={{ background: "var(--accent-dim)" }}
            >
              <Icon className="w-4 h-4" style={{ color: "var(--accent)" }} />
            </div>
            <h3 className="font-bold text-[14px] mb-1.5">{title}</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {desc}
            </p>
          </div>
        ))}
      </div>

      {/* A static mockup of what a rule card will look like -- explicitly labelled
          as an example so it can never be mistaken for a live alert. */}
      <div className="mb-3">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
          style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
        >
          Example — not live data
        </span>
      </div>
      <div
        className="card p-5 flex items-center justify-between gap-4 flex-wrap opacity-70"
        style={{ borderStyle: "dashed" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--sev-error-dim)", color: "var(--sev-error-text)" }}
          >
            <BellRing className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-[14px]">Error rate &gt; 5% for 10 minutes</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              payments-svc · notify #oncall-payments
            </div>
          </div>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider"
          style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
        >
          Mockup
        </span>
      </div>
    </AppShell>
  );
}
