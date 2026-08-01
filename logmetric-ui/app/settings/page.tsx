"use client";

import { Settings as SettingsIcon, Activity } from "lucide-react";
import AppShell from "../components/AppShell";
import { useRequireAuth } from "../lib/auth";

export default function SettingsPage() {
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
    <AppShell title="Settings" description="Organization details, API keys, and appearance.">
      <div
        className="card p-10 flex flex-col items-center text-center gap-3 animate-fade-up"
        style={{ color: "var(--text-secondary)" }}
      >
        <SettingsIcon className="w-8 h-8" style={{ color: "var(--accent)" }} />
        <p className="text-sm max-w-sm">
          API key generation and organization details are landing here next.
        </p>
      </div>
    </AppShell>
  );
}
