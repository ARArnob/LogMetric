"use client";

import { GitBranch, Activity } from "lucide-react";
import AppShell from "../components/AppShell";
import { useRequireAuth } from "../lib/auth";

export default function PatternsPage() {
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
    <AppShell
      title="Pattern Clusters"
      description="Every log is stripped of its variables and grouped by structural template."
    >
      <div
        className="card p-10 flex flex-col items-center text-center gap-3 animate-fade-up"
        style={{ color: "var(--text-secondary)" }}
      >
        <GitBranch className="w-8 h-8" style={{ color: "var(--accent)" }} />
        <p className="text-sm max-w-sm">
          Cluster cards, per-pattern volume, and member log drill-down are landing here next.
        </p>
      </div>
    </AppShell>
  );
}
