"use client";

import { Activity } from "lucide-react";
import AppShell from "../components/AppShell";
import AlertRuleSection from "../components/alerts/AlertRuleSection";
import LiveAlertFeed from "../components/alerts/LiveAlertFeed";
import { useAuth, useRequireAuth } from "../lib/auth";

export default function AlertsPage() {
  const { loading } = useRequireAuth();
  const { user } = useAuth();

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
    <AppShell title="Alerts" description="Threshold rules on error rate, traffic volume, and payload entropy -- delivered by email and in real time.">
      <div className="flex flex-col gap-4 max-w-3xl">
        <div className="animate-fade-up">
          <AlertRuleSection isAdmin={user?.role === "ADMIN"} />
        </div>
        <div className="animate-fade-up d1">
          <LiveAlertFeed />
        </div>
      </div>
    </AppShell>
  );
}
