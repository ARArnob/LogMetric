"use client";

import { ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScrollText,
  GitBranch,
  BellRing,
  Settings,
  Users,
  LogOut,
  Sun,
  Moon,
  Terminal,
  AlertCircle,
  Info,
  AlertTriangle,
  Bug,
  Server,
  Pause,
  Play,
  Search,
} from "lucide-react";
import { useFocusTrap } from "./ui/useFocusTrap";
import { useAuth } from "../lib/auth";
import { useTheme, THEMES, THEME_META } from "../lib/theme";
import { searchLogs } from "../lib/api";
import { liveTailPausedStore } from "../lib/liveTail";
import { commandPaletteOpenStore } from "../lib/commandPaletteStore";

interface Command {
  id: string;
  group: string;
  label: string;
  icon: ReactNode;
  run: () => void;
}

const NAV_PAGES: { href: string; label: string; icon: ReactNode; adminOnly?: boolean }[] = [
  { href: "/dashboard", label: "Live Telemetry", icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/explorer", label: "Log Explorer", icon: <ScrollText className="w-4 h-4" /> },
  { href: "/patterns", label: "Pattern Clusters", icon: <GitBranch className="w-4 h-4" /> },
  { href: "/alerts", label: "Alerts", icon: <BellRing className="w-4 h-4" /> },
  { href: "/settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  { href: "/team", label: "Team", icon: <Users className="w-4 h-4" />, adminOnly: true },
];

const LEVELS: { level: string; icon: ReactNode }[] = [
  { level: "ERROR", icon: <AlertCircle className="w-4 h-4" /> },
  { level: "WARN", icon: <AlertTriangle className="w-4 h-4" /> },
  { level: "INFO", icon: <Info className="w-4 h-4" /> },
  { level: "DEBUG", icon: <Bug className="w-4 h-4" /> },
];

/** Subsequence fuzzy match: every query char must appear in target, in order. Consecutive matches score higher. */
function fuzzyScore(query: string, target: string): number | null {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  let score = 0;
  let lastMatch = -2;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += lastMatch === ti - 1 ? 3 : 1;
      lastMatch = ti;
      qi++;
    }
  }
  return qi === q.length ? score : null;
}

export default function CommandPalette() {
  const open = useSyncExternalStore(commandPaletteOpenStore.subscribe, commandPaletteOpenStore.get, () => false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const liveTailPaused = useSyncExternalStore(liveTailPausedStore.subscribe, liveTailPausedStore.get, () => false);

  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [services, setServices] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = () => commandPaletteOpenStore.set(false);

  // Global shortcut -- works from anywhere authenticated, regardless of focus.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        commandPaletteOpenStore.set(!commandPaletteOpenStore.get());
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      // Modal's own focus trap moves focus into the container; grab the input specifically.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Fetched lazily, only once the palette is actually opened, so it never
  // costs a request to pages that never touch the command palette.
  useEffect(() => {
    if (!open || !token) return;
    let cancelled = false;
    searchLogs({ size: 1 })
      .then((res) => {
        if (!cancelled) setServices(res.serviceNames.map((s) => s.name).filter(Boolean));
      })
      .catch(() => {
        // A failed background fetch just means no service suggestions this time.
      });
    return () => {
      cancelled = true;
    };
  }, [open, token]);

  const containerRef = useFocusTrap<HTMLDivElement>(open, close);

  const isAdmin = user?.role === "ADMIN";

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [];

    for (const page of NAV_PAGES) {
      if (page.adminOnly && !isAdmin) continue;
      if (page.href === pathname) continue;
      list.push({
        id: `nav-${page.href}`,
        group: "Navigate",
        label: page.label,
        icon: page.icon,
        run: () => router.push(page.href),
      });
    }

    for (const t of THEMES) {
      if (t === theme) continue;
      list.push({
        id: `theme-${t}`,
        group: "Appearance",
        label: `Switch to ${THEME_META[t].label} theme`,
        icon: t === "daylight" ? <Sun className="w-4 h-4" /> : t === "amber" ? <Terminal className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
        run: () => setTheme(t),
      });
    }

    for (const { level, icon } of LEVELS) {
      list.push({
        id: `level-${level}`,
        group: "Filter by level",
        label: `Show ${level} logs`,
        icon,
        run: () => router.push(`/explorer?levels=${level}`),
      });
    }

    for (const service of services.slice(0, 20)) {
      list.push({
        id: `service-${service}`,
        group: "Jump to service",
        label: service,
        icon: <Server className="w-4 h-4" />,
        run: () => router.push(`/explorer?services=${encodeURIComponent(service)}`),
      });
    }

    list.push({
      id: "toggle-live-tail",
      group: "Live tail",
      label: liveTailPaused ? "Resume live tail" : "Pause live tail",
      icon: liveTailPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />,
      run: () => liveTailPausedStore.set(!liveTailPaused),
    });

    list.push({
      id: "sign-out",
      group: "Account",
      label: "Sign out",
      icon: <LogOut className="w-4 h-4" />,
      run: () => {
        logout();
        router.push("/");
      },
    });

    return list;
  }, [pathname, isAdmin, theme, services, liveTailPaused, router, setTheme, logout]);

  const filtered = useMemo(() => {
    if (!query) return commands;
    return commands
      .map((c) => ({ c, score: fuzzyScore(query, `${c.group} ${c.label}`) }))
      .filter((x): x is { c: Command; score: number } => x.score !== null)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.c);
  }, [commands, query]);

  const groups = useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, Command[]>();
    for (const c of filtered) {
      if (!byGroup.has(c.group)) {
        byGroup.set(c.group, []);
        order.push(c.group);
      }
      byGroup.get(c.group)!.push(c);
    }
    return order.map((group) => ({ group, items: byGroup.get(group)! }));
  }, [filtered]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  function run(command: Command) {
    close();
    command.run();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[highlight];
      if (cmd) run(cmd);
    }
  }

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${highlight}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  if (!open || typeof document === "undefined") return null;

  let flatIndex = -1;

  return createPortal(
    <div className="fixed inset-0 flex items-start justify-center pt-[12vh] p-4" style={{ zIndex: 200 }}>
      <div
        className="absolute inset-0 modal-backdrop"
        style={{ background: "rgba(0,0,0,0.55)" }}
        onClick={close}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="card modal-enter relative w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 560, maxHeight: "60vh", boxShadow: "var(--shadow-lift)" }}
      >
        <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a command or search…"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={filtered[highlight] ? `cmdk-${filtered[highlight].id}` : undefined}
            className="flex-1 bg-transparent border-0 outline-none text-sm"
            style={{ color: "var(--text-primary)" }}
          />
          <kbd
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
          >
            Esc
          </kbd>
        </div>

        <div ref={listRef} id="command-palette-list" role="listbox" className="overflow-y-auto py-2">
          {groups.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
              No matching commands.
            </p>
          ) : (
            groups.map(({ group, items }) => (
              <div key={group} className="mb-1">
                <div
                  className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  {group}
                </div>
                {items.map((item) => {
                  flatIndex += 1;
                  const idx = flatIndex;
                  const active = idx === highlight;
                  return (
                    <div
                      key={item.id}
                      id={`cmdk-${item.id}`}
                      data-idx={idx}
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={() => run(item)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm cursor-pointer"
                      style={{
                        background: active ? "var(--bg-elevated)" : "transparent",
                        color: "var(--text-primary)",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>{item.icon}</span>
                      {item.label}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
