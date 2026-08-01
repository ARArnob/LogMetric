"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Sun, Terminal, Check, Palette } from "lucide-react";
import { THEMES, THEME_META, Theme, useTheme } from "../lib/theme";

const ICONS: Record<Theme, typeof Moon> = {
  midnight: Moon,
  daylight: Sun,
  amber: Terminal,
};

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const ActiveIcon = ICONS[theme];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn btn-ghost"
        style={{ padding: compact ? "7px 9px" : "8px 12px" }}
        aria-label="Change theme"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ActiveIcon className="w-4 h-4" style={{ color: "var(--accent)" }} />
        {!compact && (
          <span className="text-xs font-semibold hidden sm:inline">{THEME_META[theme].label}</span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 card animate-fade-up"
          style={{ width: 232, padding: 6, zIndex: 100, animationDuration: "0.16s" }}
        >
          <div
            className="px-2.5 py-1.5 flex items-center gap-1.5"
            style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em" }}
          >
            <Palette className="w-3 h-3" />
            THEME
          </div>
          {THEMES.map((t) => {
            const Icon = ICONS[t];
            const active = t === theme;
            return (
              <button
                key={t}
                role="menuitem"
                onClick={() => {
                  setTheme(t);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-left transition-colors"
                style={{
                  background: active ? "var(--accent-dim)" : "transparent",
                  color: "var(--text-primary)",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "var(--bg-elevated)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <Icon className="w-4 h-4 shrink-0" style={{ color: active ? "var(--accent)" : "var(--text-secondary)" }} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold leading-tight">{THEME_META[t].label}</span>
                  <span className="block text-[11px] leading-tight mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {THEME_META[t].blurb}
                  </span>
                </span>
                {active && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
