"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  perks,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  perks?: string[];
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-12 relative"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(var(--grid-overlay) 1px, transparent 1px),
                            linear-gradient(90deg, var(--grid-overlay) 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent)",
        }}
      />
      <div
        aria-hidden="true"
        className="fixed pointer-events-none"
        style={{
          top: "-10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 760,
          height: 520,
          background: `radial-gradient(ellipse at center, var(--hero-glow-1) 0%, transparent 70%)`,
        }}
      />

      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle compact />
      </div>

      <main className="relative w-full max-w-[380px] animate-fade-up">
        <div className="flex flex-col items-center mb-7">
          <Link href="/" aria-label="LogMetric home" style={{ textDecoration: "none" }}>
            <div
              className="relative w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto"
              style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)" }}
            >
              <Activity className="w-6 h-6" style={{ color: "var(--accent)" }} />
              <span
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full pulse-live"
                style={{ background: "var(--ok)" }}
              />
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-center">
            Log<span style={{ color: "var(--accent)" }}>Metric</span>
          </h1>
          <p className="text-sm mt-1.5 text-center" style={{ color: "var(--text-secondary)" }}>
            {subtitle}
          </p>
        </div>

        {perks && (
          <div className="flex items-center justify-center gap-4 mb-5 flex-wrap">
            {perks.map((p) => (
              <div key={p} className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                <span className="w-1 h-1 rounded-full" style={{ background: "var(--ok)" }} />
                {p}
              </div>
            ))}
          </div>
        )}

        <div className="card p-7" style={{ boxShadow: "var(--shadow-lift)" }}>
          <h2 className="sr-only">{title}</h2>
          {children}
        </div>

        <p className="text-center text-sm mt-5" style={{ color: "var(--text-muted)" }}>
          {footer}
        </p>
      </main>
    </div>
  );
}
