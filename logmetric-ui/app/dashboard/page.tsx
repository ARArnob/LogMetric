"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Activity, AlertCircle, AlertTriangle, ArrowRight, GitBranch, Key, Layers, Server } from "lucide-react";
import AppShell from "../components/AppShell";
import LogStream from "../components/LogStream";
import StatTile, { StatTrend } from "../components/charts/StatTile";
import SeverityBar from "../components/charts/SeverityBar";
import VolumeHistogram from "../components/charts/VolumeHistogram";
import CopyButton from "../components/ui/CopyButton";
import TimeRangePicker, { TimeRangeValue, presetRange } from "../components/TimeRangePicker";
import { CompressionPanel } from "../components/analytics/CompressionPanel";
import { useAuth } from "../lib/auth";
import { API_BASE_URL, isDemoMode, searchLogs, getDeployments, Deployment } from "../lib/api";
import { useLogSearch } from "../lib/useLogSearch";
import { compactNumber } from "../lib/severity";
import { useServiceAliases } from "../lib/serviceAliases";

const RANGE_STORAGE_KEY = "logmetric_dashboard_range";

function readInitialRange(searchParams: URLSearchParams): TimeRangeValue {
  const id = searchParams.get("range");
  if (id) {
    if (id === "custom") {
      const start = searchParams.get("start");
      const end = searchParams.get("end");
      return { id, startDate: start ? Number(start) : undefined, endDate: end ? Number(end) : undefined };
    }
    return { id, ...presetRange(id) };
  }
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(RANGE_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as TimeRangeValue;
      } catch {
        // fall through to default
      }
    }
  }
  return { id: "all" };
}

function rangeToParams(range: TimeRangeValue): URLSearchParams {
  const params = new URLSearchParams();
  if (range.id !== "all") {
    params.set("range", range.id);
    if (range.id === "custom") {
      if (range.startDate) params.set("start", String(range.startDate));
      if (range.endDate) params.set("end", String(range.endDate));
    }
  }
  return params;
}

/** Builds an /explorer link that carries the dashboard's current range along with it, so clicking a KPI or a Top Services row lands on the same window you were looking at. */
function explorerLink(range: TimeRangeValue, extra: Record<string, string> = {}): string {
  const params = rangeToParams(range);
  for (const [k, v] of Object.entries(extra)) params.set(k, v);
  const qs = params.toString();
  return qs ? `/explorer?${qs}` : "/explorer";
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-base)", color: "var(--text-muted)" }}>
          <div className="flex items-center gap-3 text-sm">
            <Activity className="w-4 h-4 animate-spin" style={{ color: "var(--accent)" }} />
            Loading…
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { token, loading: authLoading } = useAuth();
  const { resolveServiceName } = useServiceAliases();
  const demoView = isDemoMode && !token;

  const [range, setRange] = useState<TimeRangeValue>(() => readInitialRange(searchParams));
  const lastPushedRef = useRef(searchParams.toString());

  useEffect(() => {
    if (!authLoading && !token && !isDemoMode) router.replace("/signin");
  }, [authLoading, token, router]);

  // Single owner of the search request -- LogStream reads the same result
  // via props instead of polling /logs/search a second time.
  const { data, loading, error, setFilters, refresh } = useLogSearch({
    size: 200,
    startDate: range.startDate,
    endDate: range.endDate,
  });

  const [deployments, setDeployments] = useState<Deployment[]>([]);
  useEffect(() => {
    if (range.id === "all" || !token) {
      setDeployments([]);
      return;
    }
    getDeployments(range.startDate, range.endDate)
      .then(setDeployments)
      .catch(() => setDeployments([]));
  }, [range.id, range.startDate, range.endDate, token]);

  function handleRangeChange(next: TimeRangeValue) {
    setRange(next);
    setFilters({ startDate: next.startDate, endDate: next.endDate });
    try {
      localStorage.setItem(RANGE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable -- range still applies for this session
    }
    const qs = rangeToParams(next).toString();
    lastPushedRef.current = qs;
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // ---- Error-rate trend: current window vs. the immediately preceding one
  // of the same length. Only meaningful when the window has a concrete
  // length -- "all time" has no preceding window to compare against, so the
  // indicator is omitted entirely rather than estimated (F15 spec).
  const [previousWindowStats, setPreviousWindowStats] = useState<{ total: number; errors: number } | null>(null);

  useEffect(() => {
    if (range.id === "all" || range.startDate == null) {
      setPreviousWindowStats(null);
      return;
    }
    const currentStart = range.startDate;
    const currentEnd = range.endDate ?? Date.now();
    const windowMs = currentEnd - currentStart;
    if (windowMs <= 0) {
      setPreviousWindowStats(null);
      return;
    }
    let cancelled = false;
    // size:1, not 0 -- PageRequest.of(page, 0) throws on the backend; only
    // the aggregations are read here, never the one returned log entry.
    searchLogs({ startDate: currentStart - windowMs, endDate: currentStart, size: 1 })
      .then((result) => {
        if (cancelled) return;
        const errors = result.severityDistribution.find((d) => d.level.toUpperCase() === "ERROR")?.count ?? 0;
        setPreviousWindowStats({ total: result.total, errors });
      })
      .catch(() => {
        if (!cancelled) setPreviousWindowStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [range.id, range.startDate, range.endDate]);

  // ---- Stats derived from real response data (never hardcoded) ----
  const stats = useMemo(() => {
    const errors = data.severityDistribution.find((d) => d.level.toUpperCase() === "ERROR")?.count ?? 0;
    const warns = data.severityDistribution.find((d) => d.level.toUpperCase() === "WARN")?.count ?? 0;
    const total = data.total;
    const services = data.serviceNames.length;

    return {
      total,
      errors,
      warns,
      services,
      errorRate: total > 0 ? (errors / total) * 100 : 0,
      spark: data.histogram.slice(-14).map((b) => b.count),
    };
  }, [data]);

  const errorRateTrend = useMemo((): StatTrend | undefined => {
    if (!previousWindowStats || previousWindowStats.total === 0) return undefined;
    const previousErrorRate = (previousWindowStats.errors / previousWindowStats.total) * 100;
    const delta = stats.errorRate - previousErrorRate;
    if (Math.abs(delta) < 0.005) {
      return { direction: "flat", text: "flat vs previous period", tone: "neutral" };
    }
    return {
      direction: delta > 0 ? "up" : "down",
      text: `${delta > 0 ? "+" : ""}${delta.toFixed(2)}pp vs previous period`,
      tone: delta > 0 ? "bad" : "good",
    };
  }, [previousWindowStats, stats.errorRate]);

  const topServices = useMemo(
    () => ({
      items: [...data.serviceNames]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((s) => ({ key: s.name, label: resolveServiceName(s.name), count: s.count, href: explorerLink(range, { services: s.name }) })),
      max: data.serviceNames[0] ? Math.max(...data.serviceNames.map((s) => s.count)) : 1,
    }),
    [data, range, resolveServiceName]
  );

  const topPatterns = useMemo(
    () => ({
      items: [...data.patternClusters]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((p) => ({
          key: p.patternHash,
          label: p.sampleMessage || p.patternHash.slice(0, 12),
          count: p.count,
          href: `/patterns?hash=${encodeURIComponent(p.patternHash)}`,
          icon: <GitBranch className="w-3 h-3 shrink-0" style={{ color: "var(--text-muted)" }} />,
        })),
      max: data.patternClusters[0] ? Math.max(...data.patternClusters.map((p) => p.count)) : 1,
    }),
    [data, range]
  );

  if (authLoading || (!token && !isDemoMode)) {
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
    <AppShell>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6 animate-fade-up">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Live Telemetry
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Real-time ingestion, pattern clustering, and anomaly detection — scoped to your organization.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {demoView && (
            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full tracking-widest uppercase"
              style={{
                background: "var(--sev-warn-dim)",
                color: "var(--sev-warn)",
                border: "1px solid var(--sev-warn)",
              }}
            >
              Demo mode · synthetic data
            </span>
          )}
          <TimeRangePicker value={range} onChange={handleRangeChange} />
        </div>
      </div>

      {!loading && !demoView && range.id === "all" && data.total === 0 ? (
        <FirstRunOnboarding />
      ) : (
        <>
          {/* KPI row -- every value computed from the response above; the first
              three are entry points into Explorer, not decoration. */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <div className="animate-fade-up d1">
              <Link href={explorerLink(range)} className="block h-full" style={{ textDecoration: "none" }}>
                <StatTile
                  label="Events in range"
                  value={compactNumber(stats.total)}
                  sub={stats.services > 0 ? `across ${stats.services} service${stats.services === 1 ? "" : "s"}` : "no services yet"}
                  icon={<Layers className="w-3.5 h-3.5" />}
                  spark={stats.spark}
                  loading={loading}
                />
              </Link>
            </div>
            <div className="animate-fade-up d2">
              <Link href={explorerLink(range, { levels: "ERROR" })} className="block h-full" style={{ textDecoration: "none" }}>
                <StatTile
                  label="Error rate"
                  value={`${stats.errorRate.toFixed(2)}%`}
                  sub={`${compactNumber(stats.errors)} error${stats.errors === 1 ? "" : "s"}`}
                  icon={<AlertCircle className="w-3.5 h-3.5" />}
                  accent="var(--sev-error-text)"
                  accentDim="var(--sev-error-dim)"
                  trend={errorRateTrend}
                  loading={loading}
                />
              </Link>
            </div>
            <div className="animate-fade-up d3">
              <Link href={explorerLink(range, { levels: "WARN" })} className="block h-full" style={{ textDecoration: "none" }}>
                <StatTile
                  label="Warnings"
                  value={compactNumber(stats.warns)}
                  sub="in the current window"
                  icon={<AlertTriangle className="w-3.5 h-3.5" />}
                  accent="var(--sev-warn-text)"
                  accentDim="var(--sev-warn-dim)"
                  loading={loading}
                />
              </Link>
            </div>
            <div className="animate-fade-up d4">
              <StatTile
                label="Active services"
                value={String(stats.services)}
                sub="reporting in this window"
                icon={<Server className="w-3.5 h-3.5" />}
                loading={loading}
              />
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5 items-stretch">
            <div className="card card-sheen p-5 lg:col-span-2 animate-fade-up d4">
              <h2 className="text-sm font-bold mb-0.5" style={{ color: "var(--text-primary)" }}>
                Ingest volume
              </h2>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                {data.histogramInterval}-bucketed, stacked by severity — drag to zoom into a window
              </p>
              {loading ? (
                <div className="skeleton" style={{ height: 132 }} />
              ) : (
                <VolumeHistogram
                  buckets={data.histogram}
                  deployments={deployments}
                  interval={data.histogramInterval}
                  onBrush={(start, end) => handleRangeChange({ id: "custom", startDate: start, endDate: end })}
                />
              )}
            </div>

            <div className="card card-sheen p-5 animate-fade-up d5 flex flex-col">
              <h2 className="text-sm font-bold mb-0.5" style={{ color: "var(--text-primary)" }}>
                Severity mix
              </h2>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                Share of events by level
              </p>
              {loading ? (
                <div className="skeleton flex-1" style={{ minHeight: 108 }} />
              ) : (
                <div className="flex-1 flex flex-col justify-end">
                  <SeverityBar data={data.severityDistribution} />
                </div>
              )}
            </div>
          </div>

          {/* Top services / Top patterns -- both entry points, not decoration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
            <div className="card card-sheen p-5 animate-fade-up d5">
              <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>
                Top services
              </h2>
              {loading ? (
                <div className="skeleton" style={{ height: 140 }} />
              ) : data.serviceNames.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>No services reporting in this window.</p>
              ) : (
                <TopList items={topServices.items} max={topServices.max} />
              )}
            </div>

            <div className="card card-sheen p-5 animate-fade-up d6">
              <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>
                Top patterns
              </h2>
              {loading ? (
                <div className="skeleton" style={{ height: 140 }} />
              ) : data.patternClusters.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>No pattern clusters in this window.</p>
              ) : (
                <TopList items={topPatterns.items} max={topPatterns.max} />
              )}
            </div>
          </div>

          <div className="mb-5 animate-fade-up d6">
            <CompressionPanel />
          </div>

          {/* Stream */}
          <div className="animate-fade-up d6">
            <LogStream logs={data.logs} loading={loading} error={error} onRefresh={refresh} />
          </div>
        </>
      )}
    </AppShell>
  );
}

/** Horizontal-bar top-N list shared by the Top services and Top patterns cards -- each row is a link into the filtered view it represents. */
function TopList({
  items,
  max,
}: {
  items: { key: string; label: string; count: number; href: string; icon?: React.ReactNode }[];
  max: number;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className="group flex items-center gap-2.5"
          style={{ textDecoration: "none" }}
        >
          {item.icon}
          <span
            className="text-xs font-medium truncate shrink-0"
            style={{ color: "var(--text-secondary)", width: item.icon ? "auto" : 120, maxWidth: item.icon ? 220 : undefined }}
            title={item.label}
          >
            {item.label}
          </span>
          <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: "var(--bg-inset)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max((item.count / max) * 100, 4)}%`, background: "var(--accent)" }}
            />
          </div>
          <span
            className="text-xs font-bold tabular-nums shrink-0 group-hover:underline"
            style={{ color: "var(--text-primary)" }}
          >
            {compactNumber(item.count)}
          </span>
        </Link>
      ))}
    </div>
  );
}

function FirstRunOnboarding() {
  const ingestOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
  const snippet = `curl -X POST ${ingestOrigin}/api/logs \\\n  -H "X-API-KEY: <your-api-key>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"level":"INFO","serviceName":"my-service","message":"Hello from LogMetric"}'`;

  return (
    <div className="card p-8 flex flex-col items-center text-center gap-4 animate-fade-up" style={{ maxWidth: 640, margin: "0 auto" }}>
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
      >
        <Key className="w-6 h-6" />
      </div>
      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          No logs yet -- let&apos;s fix that
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          This organization hasn&apos;t received a single event. Generate an API key and send your first
          log to see this dashboard come alive.
        </p>
      </div>
      <pre
        tabIndex={0}
        role="region"
        aria-label="Example curl command"
        className="text-xs font-mono p-3 rounded-lg overflow-x-auto whitespace-pre text-left w-full"
        style={{ background: "var(--bg-inset)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
      >
        {snippet}
      </pre>
      <div className="flex items-center gap-2">
        <CopyButton value={snippet} label="Copy command" />
        <Link href="/settings" className="btn btn-primary">
          Generate an API key
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
