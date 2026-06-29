import LogStream from "../components/LogStream";
import {
  Activity,
  LogOut,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Cpu,
  Settings,
} from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      {/* Dashboard Navbar */}
      <header
        className="border-b sticky top-0 z-50"
        style={{
          background: "rgba(10, 14, 23, 0.9)",
          backdropFilter: "blur(20px)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="relative w-7 h-7 rounded-md flex items-center justify-center"
              style={{
                background: "var(--accent-cyan-dim)",
                border: "1px solid var(--accent-cyan)",
              }}
            >
              <Activity className="w-3.5 h-3.5" style={{ color: "var(--accent-cyan)" }} />
              <span
                className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full pulse-live"
                style={{ background: "var(--accent-green)" }}
              />
            </div>
            <div>
              <span className="text-sm font-bold">
                Log<span style={{ color: "var(--accent-cyan)" }}>Metric</span>
              </span>
              <span
                className="text-xs ml-2 font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                Dashboard
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {/* Breadcrumb */}
            <nav
              className="hidden md:flex items-center gap-2 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <span>/</span>
              <span style={{ color: "var(--text-secondary)" }}>Live Telemetry</span>
            </nav>

            <div
              className="h-4 w-px hidden md:block"
              style={{ background: "var(--border-default)" }}
            />

            <button
              className="flex items-center gap-1.5 p-1.5 rounded-md transition-colors"
              style={{ color: "var(--text-muted)" }}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                color: "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <LogOut className="w-3.5 h-3.5" />
              Exit
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                Live Telemetry
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                Real-time log ingestion, pattern matching, and anomaly detection.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <span
                className="w-1.5 h-1.5 rounded-full pulse-live"
                style={{ background: "var(--accent-green)" }}
              />
              <span style={{ color: "var(--accent-green)", fontWeight: 600 }}>
                System Online
              </span>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              icon: CheckCircle,
              label: "System Status",
              value: "Operational",
              sub: "All services healthy",
              color: "var(--accent-green)",
              colorDim: "var(--accent-green-dim)",
            },
            {
              icon: AlertCircle,
              label: "Error Rate",
              value: "0.04%",
              sub: "Last 5 minutes",
              color: "var(--error)",
              colorDim: "var(--error-dim)",
            },
            {
              icon: AlertTriangle,
              label: "Active Warnings",
              value: "12",
              sub: "Across 3 services",
              color: "var(--warn)",
              colorDim: "var(--warn-dim)",
            },
            {
              icon: Cpu,
              label: "Throughput",
              value: "84k/s",
              sub: "Events ingested",
              color: "var(--accent-cyan)",
              colorDim: "var(--accent-cyan-dim)",
            },
          ].map(({ icon: Icon, label, value, sub, color, colorDim }) => (
            <div
              key={label}
              className="card-hover p-4 rounded-xl"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                  {label}
                </span>
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center"
                  style={{ background: colorDim }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
              </div>
              <div className="text-2xl font-black mb-1" style={{ color }}>
                {value}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {sub}
              </div>
            </div>
          ))}
        </div>

        {/* Log Stream */}
        <LogStream />
      </main>

      {/* Footer */}
      <footer
        className="border-t py-4 px-6"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div
          className="max-w-7xl mx-auto flex items-center justify-between text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          <span>LogMetric Dashboard · v2.4.1</span>
          <span>
            Connected to{" "}
            <span style={{ color: "var(--accent-cyan)", fontFamily: "monospace" }}>
              {process.env.NEXT_PUBLIC_API_URL || "localhost:8080"}
            </span>
          </span>
        </div>
      </footer>
    </div>
  );
}
