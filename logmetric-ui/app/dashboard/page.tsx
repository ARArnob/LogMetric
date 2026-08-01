"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Activity, AlertCircle, AlertTriangle, Layers, Server } from "lucide-react";
import AppShell from "../components/AppShell";
import LogStream from "../components/LogStream";
import StatTile from "../components/charts/StatTile";
import SeverityBar from "../components/charts/SeverityBar";
import VolumeHistogram from "../components/charts/VolumeHistogram";
import TimeRangePicker, { TimeRangeValue, presetRange } from "../components/TimeRangePicker";
import { useAuth } from "../lib/auth";
import { isDemoMode } from "../lib/api";
import { useLogSearch } from "../lib/useLogSearch";
import { compactNumber } from "../lib/severity";

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

      {/* KPI row -- every value computed from the response above */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="animate-fade-up d1">
          <StatTile
            label="Events in range"
            value={compactNumber(stats.total)}
            sub={stats.services > 0 ? `across ${stats.services} service${stats.services === 1 ? "" : "s"}` : "no services yet"}
            icon={<Layers className="w-3.5 h-3.5" />}
            spark={stats.spark}
            loading={loading}
          />
        </div>
        <div className="animate-fade-up d2">
          <StatTile
            label="Error rate"
            value={`${stats.errorRate.toFixed(2)}%`}
            sub={`${compactNumber(stats.errors)} error${stats.errors === 1 ? "" : "s"}`}
            icon={<AlertCircle className="w-3.5 h-3.5" />}
            accent="var(--sev-error-text)"
            accentDim="var(--sev-error-dim)"
            loading={loading}
          />
        </div>
        <div className="animate-fade-up d3">
          <StatTile
            label="Warnings"
            value={compactNumber(stats.warns)}
            sub="in the current window"
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            accent="var(--sev-warn-text)"
            accentDim="var(--sev-warn-dim)"
            loading={loading}
          />
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

      {/* Stream */}
      <div className="animate-fade-up d6">
        <LogStream logs={data.logs} loading={loading} error={error} onRefresh={refresh} />
      </div>
    </AppShell>
  );
}
