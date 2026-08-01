"use client";

import { Activity, Building2 } from "lucide-react";
import AppShell from "../components/AppShell";
import ApiKeySection from "../components/settings/ApiKeySection";
import { useAuth, useRequireAuth } from "../lib/auth";
import { useTheme, THEMES, THEME_META, Theme } from "../lib/theme";

const THEME_PREVIEW: Record<Theme, { bg: string; surface: string; accent: string; text: string }> = {
  midnight: { bg: "#0a0e17", surface: "#172032", accent: "#22d3ee", text: "#e8edf5" },
  daylight: { bg: "#f6f7f9", surface: "#ffffff", accent: "#0369a1", text: "#0f172a" },
  amber: { bg: "#14100a", surface: "#241d14", accent: "#ffb000", text: "#f5e6c8" },
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { loading } = useRequireAuth();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

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
      <div className="flex flex-col gap-4 max-w-2xl">
        <div className="card p-5 animate-fade-up">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              Organization
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Organization ID" value={String(user?.organizationId ?? "—")} />
            <Field label="Your role" value={user?.role ?? "—"} />
            <Field label="Signed in as" value={user?.email ?? "—"} />
          </div>
        </div>

        <div className="animate-fade-up">
          <ApiKeySection isAdmin={user?.role === "ADMIN"} />
        </div>

        <div className="card p-5 animate-fade-up">
          <h2 className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            Appearance
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((t) => {
              const preview = THEME_PREVIEW[t];
              const active = theme === t;
              return (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className="rounded-lg p-3 flex flex-col gap-2 text-left transition-all"
                  style={{
                    background: preview.surface,
                    border: `2px solid ${active ? preview.accent : "var(--border-default)"}`,
                  }}
                  aria-pressed={active}
                >
                  <div
                    className="rounded flex items-start p-2"
                    style={{ height: 36, background: preview.bg, border: `1px solid ${preview.accent}` }}
                  >
                    <div className="w-6 h-1.5 rounded-full" style={{ background: preview.accent }} />
                  </div>
                  <span className="text-xs font-semibold" style={{ color: active ? preview.accent : preview.text }}>
                    {THEME_META[t].label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
