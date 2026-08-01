"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  ScrollText,
  BellRing,
  Network,
  Settings,
  LogOut,
  Menu,
  X,
  Lock,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../lib/auth";

/**
 * Nav items marked `soon` have no backend behind them yet (Systems/Alerts
 * need Phase 1/3 server work) -- they render visibly disabled rather than
 * as links that go nowhere.
 */
const NAV = [
  { href: "/dashboard", label: "Live Telemetry", icon: LayoutDashboard, soon: false },
  { href: "/dashboard", label: "Log Explorer", icon: ScrollText, soon: true },
  { href: "/dashboard", label: "Alerts", icon: BellRing, soon: true },
  { href: "/dashboard", label: "Topology", icon: Network, soon: true },
  { href: "/dashboard", label: "Settings", icon: Settings, soon: true },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleSignOut() {
    logout();
    router.push("/");
  }

  const initial = user?.email?.[0]?.toUpperCase() ?? "?";

  const sidebar = (
    <>
      <div className="px-4 py-4">
        <Link href="/" className="flex items-center gap-2.5" style={{ textDecoration: "none" }}>
          <div
            className="relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)" }}
          >
            <Activity className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <span
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full pulse-live"
              style={{ background: "var(--ok)" }}
            />
          </div>
          <span className="text-[15px] font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Log<span style={{ color: "var(--accent)" }}>Metric</span>
          </span>
        </Link>
      </div>

      <nav className="px-2 flex-1">
        {NAV.map((item, i) => {
          const Icon = item.icon;
          const active = i === 0;
          return (
            <button
              key={item.label}
              disabled={item.soon}
              onClick={() => !item.soon && setMobileOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 text-left transition-colors"
              style={{
                background: active ? "var(--accent-dim)" : "transparent",
                color: active
                  ? "var(--accent)"
                  : item.soon
                    ? "var(--text-muted)"
                    : "var(--text-secondary)",
                cursor: item.soon ? "not-allowed" : "pointer",
                border: "1px solid",
                borderColor: active ? "var(--accent-dim)" : "transparent",
              }}
              title={item.soon ? "Not built yet — needs backend work" : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-[13px] font-medium flex-1">{item.label}</span>
              {item.soon && <Lock className="w-3 h-3 shrink-0 opacity-60" />}
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        {user && (
          <div className="flex items-center gap-2.5 px-1 mb-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="text-[12px] font-semibold truncate"
                style={{ color: "var(--text-primary)" }}
                title={user.email}
              >
                {user.email}
              </div>
              <div className="text-[10px] font-bold tracking-wider" style={{ color: "var(--accent)" }}>
                {user.role}
              </div>
            </div>
          </div>
        )}
        <button onClick={handleSignOut} className="btn btn-quiet w-full" style={{ justifyContent: "flex-start" }}>
          <LogOut className="w-3.5 h-3.5" />
          <span className="text-[13px]">{token ? "Sign out" : "Exit"}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col fixed inset-y-0 left-0"
        style={{
          width: 232,
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border-subtle)",
        }}
      >
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0"
            style={{ background: "rgba(0,0,0,0.6)", zIndex: 60 }}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="lg:hidden fixed inset-y-0 left-0 flex flex-col animate-fade-up"
            style={{
              width: 232,
              background: "var(--bg-surface)",
              borderRight: "1px solid var(--border-default)",
              zIndex: 61,
              animationDuration: "0.2s",
            }}
          >
            {sidebar}
          </aside>
        </>
      )}

      {/* Main column -- offset by the fixed sidebar's width on large screens */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[232px]">
        <header
          className="sticky top-0 z-50 flex items-center justify-between gap-3 px-5 py-3"
          style={{
            background: "color-mix(in srgb, var(--bg-base) 88%, transparent)",
            backdropFilter: "blur(14px)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              className="lg:hidden btn btn-quiet"
              style={{ padding: 7 }}
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full pulse-live shrink-0" style={{ background: "var(--ok)" }} />
              <span className="text-xs font-semibold" style={{ color: "var(--ok)" }}>
                Connected
              </span>
            </div>
          </div>

          <ThemeToggle />
        </header>

        <main className="flex-1 px-5 py-6 md:px-8 md:py-8 w-full">{children}</main>
      </div>
    </div>
  );
}
