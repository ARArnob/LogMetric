"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Zap,
  Search,
  ArrowRight,
  GitBranch,
  Lock,
  Server,
  Cpu,
  Database,
  BarChart3,
  Waves,
} from "lucide-react";
import ThemeToggle from "./components/ThemeToggle";

// Badge text uses the -text tokens so the level stays legible on the light
// theme. This pool is cycled by TerminalWindow (F16) rather than rendered
// once and left static -- a wider pool than the visible window (5 rows)
// means the loop doesn't read as an obvious immediate repeat.
const TERMINAL_ROW_POOL = [
  { ts: "10:42:31.012", level: "INFO", svc: "auth-service", hash: "3a7f92b1", msg: "User login successful uid=u_8812 ip=192.168.1.45", c: "var(--sev-info-text)", b: "var(--sev-info-dim)" },
  { ts: "10:42:31.088", level: "WARN", svc: "rate-limiter", hash: "e9c4d723", msg: "Rate limit threshold 85% — uid=u_8812", c: "var(--sev-warn-text)", b: "var(--sev-warn-dim)" },
  { ts: "10:42:31.204", level: "ERROR", svc: "ingest-worker", hash: "b2f41a09", msg: "Upstream timeout after 5000ms — retrying batch_id=b_0041", c: "var(--sev-error-text)", b: "var(--sev-error-dim)" },
  { ts: "10:42:31.390", level: "INFO", svc: "pattern-engine", hash: "3a7f92b1", msg: "Pattern match — cluster_size=142", c: "var(--sev-info-text)", b: "var(--sev-info-dim)" },
  { ts: "10:42:31.512", level: "DEBUG", svc: "rabbitmq-consumer", hash: "7d83c091", msg: "Queue depth 2341 msgs — consumer_lag=12ms", c: "var(--sev-debug-text)", b: "var(--sev-debug-dim)" },
  { ts: "10:42:32.077", level: "INFO", svc: "payments-svc", hash: "5c11a4e2", msg: "Charge succeeded amount=4200 currency=usd", c: "var(--sev-info-text)", b: "var(--sev-info-dim)" },
  { ts: "10:42:32.301", level: "WARN", svc: "inventory-svc", hash: "9b02f7d4", msg: "Stock threshold breached sku=SKU-3391 qty=2", c: "var(--sev-warn-text)", b: "var(--sev-warn-dim)" },
  { ts: "10:42:32.588", level: "INFO", svc: "search-index", hash: "c4a819f0", msg: "Bulk index committed docs=214 took_ms=38", c: "var(--sev-info-text)", b: "var(--sev-info-dim)" },
  { ts: "10:42:32.812", level: "ERROR", svc: "notification-svc", hash: "1f6d3a88", msg: "SMTP relay refused connection — retry scheduled", c: "var(--sev-error-text)", b: "var(--sev-error-dim)" },
  { ts: "10:42:33.045", level: "DEBUG", svc: "auth-service", hash: "e0b12c73", msg: "Token cache hit uid=u_2210 ttl_s=298", c: "var(--sev-debug-text)", b: "var(--sev-debug-dim)" },
  { ts: "10:42:33.290", level: "INFO", svc: "pattern-engine", hash: "b2f41a09", msg: "Cluster size grew to 143 — anomaly score 0.12", c: "var(--sev-info-text)", b: "var(--sev-info-dim)" },
  { ts: "10:42:33.510", level: "WARN", svc: "rate-limiter", hash: "e9c4d723", msg: "Rate limit threshold 91% — uid=u_8812", c: "var(--sev-warn-text)", b: "var(--sev-warn-dim)" },
];

const TERMINAL_WINDOW_SIZE = 5;
const TERMINAL_TICK_MS = 2400;

/**
 * Cycles a fixed-size window through TERMINAL_ROW_POOL, looping forever.
 * Each tick drops the oldest visible row and appends the next pool entry
 * under a fresh `uid` -- React's key-based reconciliation then only mounts
 * (and thus only animates in) the one genuinely new row; the four that
 * shift up keep their existing DOM nodes and never replay an entrance.
 * Skips the interval entirely under reduced-motion rather than just muting
 * the animation -- the content itself shouldn't keep changing either.
 */
function useTerminalRows() {
  const [rows, setRows] = useState(() =>
    TERMINAL_ROW_POOL.slice(0, TERMINAL_WINDOW_SIZE).map((r, i) => ({ ...r, uid: i }))
  );

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let poolIndex = TERMINAL_WINDOW_SIZE % TERMINAL_ROW_POOL.length;
    let nextUid = TERMINAL_WINDOW_SIZE;
    const id = setInterval(() => {
      const next = { ...TERMINAL_ROW_POOL[poolIndex], uid: nextUid };
      poolIndex = (poolIndex + 1) % TERMINAL_ROW_POOL.length;
      nextUid += 1;
      setRows((prev) => [...prev.slice(1), next]);
    }, TERMINAL_TICK_MS);
    return () => clearInterval(id);
  }, []);

  return rows;
}

const FEATURES = [
  { Icon: Zap, title: "Async message bus", desc: "RabbitMQ-backed ingestion decouples producers from consumers, so a traffic spike queues instead of dropping.", tag: "RabbitMQ" },
  { Icon: Search, title: "SHA-256 pattern engine", desc: "Dynamic cleansers strip variables from each line, hash the template, and cluster structurally identical events across services.", tag: "Clustering" },
  { Icon: Activity, title: "Anomaly detection", desc: "EMA-based z-scores catch volumetric spikes; Shannon entropy flags obfuscated or encoded payloads.", tag: "Statistics" },
  { Icon: Database, title: "Elasticsearch index", desc: "Every processed event lands in Elasticsearch with aggregations for sub-second search and histograms.", tag: "Search" },
  { Icon: Waves, title: "Real-time streaming", desc: "Server-Sent Events push each enriched log to the dashboard the moment it's indexed — scoped per organization.", tag: "SSE" },
  { Icon: Lock, title: "Multi-tenant by design", desc: "Every read path is scoped to your organization, enforced server-side. API keys are hashed; roles gate every mutation.", tag: "Security" },
];

// Every entry must anchor to a section that actually exists on this page --
// a nav link that scrolls nowhere is worse than a shorter nav. A third real
// link ("Get started") used to sit here pointing at the CTA section, but it
// duplicated the header's own "Get started" button (same label, different
// behavior) and, on most viewport heights, scrolled to nearly the same spot
// as "Pipeline" anyway -- the CTA section was too short for the page to
// scroll it fully into view, so both anchors clamped against the bottom of
// the page. Visual balance now comes from the static badge next to these
// two links instead of a third link with nowhere real to go.
const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pipeline", href: "#pipeline" },
];

const PIPELINE = [
  { icon: Server, label: "Producers", sub: "Services · Apps" },
  { icon: Cpu, label: "RabbitMQ", sub: "Async queue" },
  { icon: GitBranch, label: "Pattern engine", sub: "SHA-256 clustering" },
  { icon: Database, label: "Elasticsearch", sub: "Index & aggregate" },
  { icon: BarChart3, label: "Dashboard", sub: "Live telemetry" },
];

export default function Home() {
  const terminalRows = useTerminalRows();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
      {/* Nav */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: "color-mix(in srgb, var(--bg-base) 85%, transparent)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="relative w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)" }}
            >
              <Activity className="w-4 h-4" style={{ color: "var(--accent)" }} />
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full pulse-live"
                style={{ background: "var(--ok)" }}
              />
            </div>
            <span className="text-[15px] font-extrabold tracking-tight">
              Log<span style={{ color: "var(--accent)" }}>Metric</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-md transition-colors"
                style={{ color: "var(--text-secondary)", textDecoration: "none" }}
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <Link href="/signin" className="btn btn-ghost hidden sm:inline-flex" style={{ padding: "8px 14px" }}>
              Sign in
            </Link>
            <Link href="/signup" className="btn btn-primary" style={{ padding: "8px 16px" }}>
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden pt-20 pb-24 px-5">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(var(--grid-overlay) 1px, transparent 1px),
                                linear-gradient(90deg, var(--grid-overlay) 1px, transparent 1px)`,
              backgroundSize: "56px 56px",
              maskImage: "radial-gradient(ellipse 70% 55% at 50% 30%, black, transparent)",
              WebkitMaskImage: "radial-gradient(ellipse 70% 55% at 50% 30%, black, transparent)",
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              top: "-15%", left: "50%", transform: "translateX(-50%)",
              width: 900, height: 600,
              background: "radial-gradient(ellipse at center, var(--hero-glow-1) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              top: "10%", left: "20%",
              width: 500, height: 400,
              background: "radial-gradient(ellipse at center, var(--hero-glow-2) 0%, transparent 70%)",
            }}
          />

          <div className="relative max-w-3xl mx-auto text-center">
            <div
              className="animate-fade-up inline-flex items-center gap-2 mb-7 px-3 py-1.5 rounded-full"
              style={{
                background: "var(--ok-dim)",
                border: "1px solid color-mix(in srgb, var(--ok) 30%, transparent)",
                color: "var(--ok-text)",
                fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full pulse-live" style={{ background: "var(--ok)" }} />
              Multi-tenant · Real-time · Open source
            </div>

            <h1
              className="animate-fade-up d1 text-4xl md:text-6xl font-black tracking-tight mb-5"
              style={{ lineHeight: 1.04, letterSpacing: "-0.03em" }}
            >
              Log intelligence
              <br />
              <span className="gradient-text">at machine scale</span>
            </h1>

            {/* Deliberately short: the badge above already claims real-time
                and multi-tenant, so repeating them here just made the hero
                read as a wall of text. This says what it *does*; the
                Features section says the rest. */}
            <p
              className="animate-fade-up d2 text-base md:text-lg max-w-lg mx-auto mb-9"
              style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}
            >
              Asynchronous ingestion, SHA-256 pattern clustering, and live anomaly detection —
              in one pipeline.
            </p>

            <div className="animate-fade-up d3 flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
              <Link href="/signup" className="btn btn-primary w-full sm:w-auto" style={{ padding: "12px 24px" }}>
                Start ingesting logs
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/signin" className="btn btn-ghost w-full sm:w-auto" style={{ padding: "12px 24px" }}>
                <Activity className="w-4 h-4" style={{ color: "var(--accent)" }} />
                Sign in to dashboard
              </Link>
            </div>
          </div>

          {/* Terminal */}
          <div className="relative max-w-4xl mx-auto animate-fade-up d4">
            <div className="card overflow-hidden" style={{ boxShadow: "var(--shadow-lift)" }}>
              <div
                className="flex items-center gap-3 px-4 py-2.5"
                style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)" }}
              >
                <div className="flex gap-1.5">
                  {["var(--sev-error)", "var(--sev-warn)", "var(--ok)"].map((c) => (
                    <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: 0.85 }} />
                  ))}
                </div>
                <div className="flex-1 text-center font-mono" style={{ color: "var(--text-muted)", fontSize: 11 }}>
                  logmetric — live stream
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full pulse-live" style={{ background: "var(--ok)" }} />
                  <span style={{ color: "var(--ok-text)", fontSize: 10, fontWeight: 700 }}>LIVE</span>
                </div>
              </div>

              <div className="p-4 font-mono overflow-x-auto" style={{ fontSize: 11.5, lineHeight: 1.9, minHeight: 200 }}>
                {terminalRows.map((row) => (
                  <div key={row.uid} className="flex items-start gap-3 whitespace-nowrap log-row-enter">
                    <span style={{ color: "var(--text-muted)" }}>{row.ts}</span>
                    <span
                      className="px-1.5 rounded text-center shrink-0"
                      style={{ color: row.c, background: row.b, fontSize: 10, fontWeight: 800, minWidth: 48 }}
                    >
                      {row.level}
                    </span>
                    <span style={{ color: "var(--accent)", minWidth: 132 }}>{row.svc}</span>
                    <span style={{ color: "var(--text-muted)" }}>[{row.hash}]</span>
                    <span style={{ color: "var(--text-secondary)" }}>{row.msg}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-2" style={{ color: "var(--text-muted)" }}>
                  <span>$</span>
                  <span style={{ color: "var(--accent)" }}>logmetric stream --follow</span>
                  <span className="cursor-blink" style={{ color: "var(--accent)" }}>▊</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-5 pb-24" style={{ scrollMarginTop: 80 }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <p className="eyebrow mb-3">Core capabilities</p>
              <h2 className="text-3xl font-black tracking-tight" style={{ letterSpacing: "-0.02em" }}>
                Every layer of your logs, covered
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map(({ Icon, title, desc, tag }) => (
                <div key={title} className="card card-interactive card-sheen p-5">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: "var(--accent-dim)" }}
                  >
                    <Icon className="w-4.5 h-4.5" style={{ color: "var(--accent)", width: 18, height: 18 }} />
                  </div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-[15px]">{title}</h3>
                    <span
                      className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                      style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
                    >
                      {tag}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pipeline */}
        <section id="pipeline" className="px-5 pb-24" style={{ scrollMarginTop: 80 }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="eyebrow mb-3">How it works</p>
              <h2 className="text-3xl font-black tracking-tight" style={{ letterSpacing: "-0.02em" }}>
                Ingest, cluster, stream
              </h2>
            </div>

            <div className="card card-sheen p-7">
              <div className="flex flex-col md:flex-row items-stretch justify-between gap-1">
                {PIPELINE.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-3 md:flex-1 md:min-w-0">
                      <div className="flex flex-col items-center gap-2.5 md:w-full md:text-center">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: "var(--bg-inset)", border: "1px solid var(--border-default)" }}
                        >
                          <Icon className="w-5 h-5" style={{ color: "var(--accent)" }} />
                        </div>
                        <div>
                          <div className="font-bold text-[13px]">{item.label}</div>
                          <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {item.sub}
                          </div>
                        </div>
                      </div>
                      {i < PIPELINE.length - 1 && (
                        <div className="relative w-4 h-4 shrink-0 mx-auto md:mx-1 overflow-hidden">
                          <ArrowRight
                            className="w-4 h-4 rotate-90 md:rotate-0"
                            style={{ color: "var(--border-strong)" }}
                            aria-hidden
                          />
                          {/* Subtle "data flowing through the pipeline" cue -- purely
                              decorative, so it's aria-hidden like the arrow itself. */}
                          <span
                            className="absolute top-1/2 -translate-y-1/2 rounded-full pipeline-flow-dot"
                            style={{ width: 3, height: 3, background: "var(--accent)", animationDelay: `${i * 0.35}s` }}
                            aria-hidden
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* CTA -- bottom padding only, like every other section on this page
            (Features/Pipeline are pb-24 with no top padding; adding py-* here
            instead of pb-* doubled the visual gap below Pipeline and broke
            the page's spacing rhythm). Slightly larger than pb-24 to still
            leave a bit more room below "Pipeline" for it to scroll fully
            into view, though that matters less now that "Get started" isn't
            a nav link anymore -- there's no second anchor to collide with. */}
        <section id="get-started" className="px-5 pb-24 md:pb-32" style={{ scrollMarginTop: 80 }}>
          <div className="max-w-4xl mx-auto w-full">
            <div
              className="card card-sheen p-10 md:p-14 text-center relative overflow-hidden"
              style={{
                background: `linear-gradient(140deg, var(--hero-glow-1) 0%, transparent 55%, var(--hero-glow-2) 100%), var(--bg-surface)`,
              }}
            >
              <p className="eyebrow mb-4">Get started</p>
              <h2 className="text-3xl font-black tracking-tight mb-3" style={{ letterSpacing: "-0.02em" }}>
                Monitor. Detect. Resolve.
              </h2>
              <p className="max-w-md mx-auto mb-8 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Spin up a workspace, generate an API key, and start streaming logs in minutes.
              </p>
              <Link href="/signup" className="btn btn-primary" style={{ padding: "12px 28px" }}>
                Create your workspace
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-7 px-5" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <span className="text-sm font-bold">
              Log<span style={{ color: "var(--accent)" }}>Metric</span>
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            © 2026 LogMetric · Built for observability at scale
          </p>
        </div>
      </footer>
    </div>
  );
}
