import Link from "next/link";
import {
  Activity,
  Zap,
  Search,
  ShieldCheck,
  ArrowRight,
  BarChart3,
  GitBranch,
  Lock,
  Server,
  Cpu,
  Database,
} from "lucide-react";

export default function Home() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      {/* Navigation */}
      <header
        style={{
          background: "rgba(10, 14, 23, 0.95)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              style={{
                background: "var(--accent-cyan-dim)",
                border: "1px solid var(--accent-cyan)",
                borderRadius: 8,
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <Activity className="w-4 h-4" style={{ color: "var(--accent-cyan)" }} />
              <span
                className="pulse-live"
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--accent-green)",
                }}
              />
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Log<span style={{ color: "var(--accent-cyan)" }}>Metric</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            {["Features", "Architecture", "Metrics"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="px-3 py-1.5 rounded-md"
                style={{ color: "var(--text-secondary)", textDecoration: "none" }}
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/signin"
              className="hidden sm:block px-4 py-2 text-sm font-medium rounded-md"
              style={{
                color: "var(--text-secondary)",
                border: "1px solid var(--border-default)",
                textDecoration: "none",
              }}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm font-semibold rounded-md"
              style={{ background: "var(--accent-cyan)", color: "#0a0e17", textDecoration: "none" }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-24 pb-32 px-6">
          {/* Background grid */}
          <div
            className="absolute inset-0"
            style={{
              opacity: 0.15,
              backgroundImage: `linear-gradient(rgba(0,212,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.1) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
          <div
            className="absolute top-0 left-1/2 pointer-events-none"
            style={{
              transform: "translateX(-50%)",
              width: 800,
              height: 500,
              background: "radial-gradient(ellipse at center, rgba(0,212,255,0.06) 0%, transparent 70%)",
            }}
          />

          <div className="relative max-w-5xl mx-auto text-center">
            <div
              className="animate-fade-up inline-flex items-center gap-2.5 mb-8"
              style={{
                background: "var(--accent-green-dim)",
                border: "1px solid rgba(0,255,136,0.2)",
                color: "var(--accent-green)",
                borderRadius: 999,
                padding: "6px 14px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              <span
                className="pulse-live"
                style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-green)", display: "inline-block" }}
              />
              System Online · v2.4.1 · 99.97% Uptime
            </div>

            <h1
              className="animate-fade-up-delay-1 text-5xl font-black tracking-tight mb-6"
              style={{ color: "var(--text-primary)", lineHeight: 1.05 }}
            >
              Log Intelligence
              <br />
              <span className="gradient-text">at Machine Scale</span>
            </h1>

            <p
              className="animate-fade-up-delay-2 text-lg max-w-2xl mx-auto mb-10"
              style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
            >
              LogMetric ingests millions of log events per second using RabbitMQ, clusters them by
              SHA-256 pattern hash, and pushes real-time anomaly signals to your dashboard before
              your on-call engineer even opens Slack.
            </p>

            <div className="animate-fade-up-delay-3 flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                href="/signup"
                className="flex items-center gap-2 px-7 py-3.5 rounded-lg text-sm font-bold w-full sm:w-auto justify-center"
                style={{ background: "var(--accent-cyan)", color: "#0a0e17", textDecoration: "none" }}
              >
                Start Ingesting Logs
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-7 py-3.5 rounded-lg text-sm font-semibold w-full sm:w-auto justify-center"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                  textDecoration: "none",
                }}
              >
                <Activity className="w-4 h-4" style={{ color: "var(--accent-cyan)" }} />
                View Live Dashboard
              </Link>
            </div>

            {/* Stats bar */}
            <div
              className="animate-fade-up-delay-4 inline-grid grid-cols-3"
              style={{
                border: "1px solid var(--border-default)",
                borderRadius: 12,
                overflow: "hidden",
                gap: 1,
                background: "var(--border-default)",
              }}
            >
              {[
                { value: "10M+", label: "Events / sec" },
                { value: "< 2ms", label: "P99 Latency" },
                { value: "SHA-256", label: "Pattern Hashing" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="px-8 py-5 text-center"
                  style={{ background: "var(--bg-surface)" }}
                >
                  <div className="text-2xl font-black mb-1" style={{ color: "var(--accent-cyan)" }}>
                    {stat.value}
                  </div>
                  <div className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Terminal preview */}
        <section className="px-6 pb-24">
          <div className="max-w-5xl mx-auto">
            <div
              className="rounded-xl overflow-hidden"
              style={{
                border: "1px solid var(--border-default)",
                background: "var(--bg-surface)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,212,255,0.05)",
              }}
            >
              <div
                className="flex items-center gap-3 px-5 py-3.5"
                style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)" }}
              >
                <div className="flex gap-2">
                  {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                    <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
                  ))}
                </div>
                <div className="flex-1 text-center text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                  logmetric — live stream — ws://localhost:8080/stream
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent-green)" }} />
                  <span className="text-xs" style={{ color: "var(--accent-green)" }}>LIVE</span>
                </div>
              </div>

              <div className="p-6 font-mono text-xs leading-6 overflow-x-auto" style={{ minHeight: 220 }}>
                {[
                  { ts: "2026-06-30T10:42:31.012Z", level: "INFO", svc: "auth-service", hash: "3a7f92b1", msg: "User login successful uid=u_8812 ip=192.168.1.45", lc: "var(--info)", lb: "var(--info-dim)" },
                  { ts: "2026-06-30T10:42:31.088Z", level: "WARN", svc: "rate-limiter", hash: "e9c4d723", msg: "Rate limit threshold 85% — uid=u_8812 endpoint=/api/logs", lc: "var(--warn)", lb: "var(--warn-dim)" },
                  { ts: "2026-06-30T10:42:31.204Z", level: "ERROR", svc: "ingest-worker", hash: "b2f41a09", msg: "Upstream timeout after 5000ms — retrying batch_id=b_0041", lc: "var(--error)", lb: "var(--error-dim)" },
                  { ts: "2026-06-30T10:42:31.390Z", level: "INFO", svc: "pattern-engine", hash: "3a7f92b1", msg: "Pattern match — cluster_size=142 pattern=user_login_success", lc: "var(--info)", lb: "var(--info-dim)" },
                  { ts: "2026-06-30T10:42:31.512Z", level: "DEBUG", svc: "rabbitmq-consumer", hash: "7d83c091", msg: "Queue depth 2341 msgs — consumer_lag=12ms queue=log.ingest.primary", lc: "var(--text-muted)", lb: "rgba(77,87,105,0.15)" },
                ].map((row, i) => (
                  <div key={i} className="flex items-start gap-4 py-0.5">
                    <span style={{ color: "var(--text-muted)", minWidth: 180 }}>{row.ts}</span>
                    <span
                      className="px-2 py-0.5 rounded text-center"
                      style={{ color: row.lc, background: row.lb, minWidth: 52, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}
                    >
                      {row.level}
                    </span>
                    <span style={{ color: "var(--accent-cyan)", minWidth: 140 }}>{row.svc}</span>
                    <span style={{ color: "var(--text-muted)", minWidth: 80 }}>[{row.hash}]</span>
                    <span style={{ color: "var(--text-secondary)" }}>{row.msg}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-2" style={{ color: "var(--text-muted)" }}>
                  <span>$</span>
                  <span style={{ color: "var(--accent-cyan)" }}>logmetric stream --follow</span>
                  <span className="cursor-blink" style={{ color: "var(--accent-cyan)" }}>_</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="px-6 pb-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "var(--accent-cyan)" }}>
                Core Capabilities
              </p>
              <h2 className="text-3xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                Every layer of your logs, covered
              </h2>
              <p className="mt-4 max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
                From raw ingestion to intelligent clustering, LogMetric handles the entire pipeline.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { Icon: Zap, color: "#ffd700", colorDim: "rgba(255,215,0,0.1)", title: "Async Message Bus", desc: "RabbitMQ-powered ingestion decouples producers from consumers. Zero backpressure, unlimited burst capacity.", tag: "RabbitMQ" },
                { Icon: Search, color: "var(--accent-cyan)", colorDim: "var(--accent-cyan-dim)", title: "SHA-256 Pattern Engine", desc: "Dynamic cleansers strip variables from log lines, compute a hash, and cluster structurally identical events across services.", tag: "Pattern Matching" },
                { Icon: Activity, color: "var(--accent-green)", colorDim: "var(--accent-green-dim)", title: "Real-Time Anomaly Detection", desc: "Statistical thresholds detect sudden spikes in error rates, latency outliers, or unusual service behavior automatically.", tag: "AI-powered" },
                { Icon: Database, color: "#a78bfa", colorDim: "rgba(167,139,250,0.12)", title: "Elasticsearch Index", desc: "All processed events land in Elasticsearch for sub-second full-text search across billions of log entries.", tag: "Elasticsearch" },
                { Icon: GitBranch, color: "#fb923c", colorDim: "rgba(251,146,60,0.12)", title: "Log Clustering", desc: "Related events are grouped by pattern similarity, giving you a high-level view of your system at a glance.", tag: "Clustering" },
                { Icon: Lock, color: "#34d399", colorDim: "rgba(52,211,153,0.12)", title: "Secure by Default", desc: "All log data is encrypted in transit and at rest. Role-based access controls let you share dashboards safely.", tag: "Security" },
              ].map(({ Icon, color, colorDim, title, desc, tag }) => (
                <div
                  key={title}
                  className="card-hover p-6 rounded-xl"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5" style={{ background: colorDim }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>{title}</h3>
                    <span
                      className="text-xs font-bold tracking-wide uppercase px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                      style={{ background: colorDim, color, fontSize: 10 }}
                    >
                      {tag}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Architecture Section */}
        <section id="architecture" className="px-6 pb-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "var(--accent-cyan)" }}>
                System Architecture
              </p>
              <h2 className="text-3xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                Built for production from day one
              </h2>
            </div>

            <div
              className="rounded-xl p-8"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center">
                {[
                  { icon: Server, label: "Log Producers", sub: "Services · Apps · K8s", color: "#fb923c" },
                  null,
                  { icon: Cpu, label: "RabbitMQ Queue", sub: "Async Message Bus", color: "var(--warn)" },
                  null,
                  { icon: GitBranch, label: "Pattern Engine", sub: "SHA-256 Clustering", color: "var(--accent-cyan)" },
                  null,
                  { icon: Database, label: "Elasticsearch", sub: "Index & Search", color: "#a78bfa" },
                  null,
                  { icon: BarChart3, label: "LogMetric UI", sub: "Real-time Dashboard", color: "var(--accent-green)" },
                ].map((item, i) => {
                  if (item === null) {
                    return (
                      <div key={i} className="text-2xl hidden md:block" style={{ color: "var(--border-strong)" }}>→</div>
                    );
                  }
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex flex-col items-center gap-3">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center"
                        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
                      >
                        <Icon className="w-6 h-6" style={{ color: item.color }} />
                      </div>
                      <div>
                        <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{item.label}</div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.sub}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="metrics" className="px-6 pb-24">
          <div className="max-w-6xl mx-auto">
            <div
              className="rounded-2xl p-10 md:p-16 text-center relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(123,97,255,0.06) 50%, rgba(0,255,136,0.04) 100%)",
                border: "1px solid var(--border-default)",
              }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg, transparent, var(--accent-cyan), transparent)" }}
              />
              <p className="text-xs font-bold tracking-widest uppercase mb-6" style={{ color: "var(--accent-cyan)" }}>
                Trusted in Production
              </p>
              <h2 className="text-3xl font-black tracking-tight mb-4" style={{ color: "var(--text-primary)" }}>
                Monitor. Detect. Resolve.
              </h2>
              <p className="max-w-xl mx-auto mb-10" style={{ color: "var(--text-secondary)" }}>
                LogMetric gives your team the observability layer they need to stay ahead of incidents.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  href="/signup"
                  className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg text-sm font-bold"
                  style={{ background: "var(--accent-cyan)", color: "#0a0e17", textDecoration: "none" }}
                >
                  Start Free <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg text-sm font-semibold"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                    textDecoration: "none",
                  }}
                >
                  <ShieldCheck className="w-4 h-4" style={{ color: "var(--accent-green)" }} />
                  View Demo Dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 px-6" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "var(--accent-cyan-dim)" }}>
              <Activity className="w-3.5 h-3.5" style={{ color: "var(--accent-cyan)" }} />
            </div>
            <span className="text-sm font-semibold">
              Log<span style={{ color: "var(--accent-cyan)" }}>Metric</span>
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            © 2026 LogMetric. Built for observability at scale.
          </p>
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
            {["Privacy", "Docs", "Status"].map((item) => (
              <a key={item} href="#" style={{ color: "var(--text-muted)", textDecoration: "none" }}>{item}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
