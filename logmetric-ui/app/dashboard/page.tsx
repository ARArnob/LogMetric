"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertCircle, AlertTriangle, Layers, Server } from "lucide-react";
import AppShell from "../components/AppShell";
import LogStream from "../components/LogStream";
import StatTile from "../components/charts/StatTile";
import SeverityBar, { SeverityDatum } from "../components/charts/SeverityBar";
import VolumeHistogram, { HistogramBucket } from "../components/charts/VolumeHistogram";
import { useAuth } from "../lib/auth";
import {
  ApiError,
  LogEntry,
  LogSearchResponse,
  fetchDemoLogs,
  isDemoMode,
  searchLogs,
} from "../lib/api";
import { compactNumber } from "../lib/severity";

export default function Dashboard() {
  const router = useRouter();
  const { token, loading: authLoading } = useAuth();
  const demoView = isDemoMode && !token;

  const [data, setData] = useState<LogSearchResponse | null>(null);
  const [demoLogs, setDemoLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !token && !isDemoMode) router.replace("/signin");
  }, [authLoading, token, router]);

  const load = useCallback(async () => {
    if (demoView) {
      setDemoLogs(fetchDemoLogs(60));
      setLoading(false);
      return;
    }
    if (!token) return;
    try {
      setData(await searchLogs({ size: 200 }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) router.replace("/signin");
    } finally {
      setLoading(false);
    }
  }, [demoView, token, router]);

  useEffect(() => {
    if (authLoading) return;
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load, authLoading]);

  // ---- Stats derived from real response data (never hardcoded) ----
  const stats = useMemo(() => {
    const sev = new Map<string, number>();
    let total = 0;
    let services = 0;
    let buckets: HistogramBucket[] = [];

    if (demoView) {
      for (const l of demoLogs) {
        const k = l.level.toUpperCase();
        sev.set(k, (sev.get(k) ?? 0) + 1);
      }
      total = demoLogs.length;
      services = new Set(demoLogs.map((l) => l.serviceName)).size;
      buckets = bucketize(demoLogs);
    } else if (data) {
      for (const d of data.severityDistribution ?? []) {
        const k = String(d.level ?? "").toUpperCase();
        if (k) sev.set(k, Number(d.count ?? 0));
      }
      total = data.total ?? 0;
      services = new Set((data.logs ?? []).map((l) => l.serviceName)).size;
      buckets = (data.histogram ?? []).map((h) => ({
        timestamp: Number(h.timestamp ?? 0),
        count: Number(h.count ?? 0),
        levels: (h.levels as Record<string, number>) ?? {},
      }));
    }

    const errors = sev.get("ERROR") ?? 0;
    const warns = sev.get("WARN") ?? 0;
    const severity: SeverityDatum[] = [...sev].map(([level, count]) => ({ level, count }));

    return {
      total,
      errors,
      warns,
      services,
      errorRate: total > 0 ? (errors / total) * 100 : 0,
      severity,
      buckets,
      spark: buckets.slice(-14).map((b) => b.count),
    };
  }, [data, demoLogs, demoView]);

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
            Hourly buckets, stacked by severity
          </p>
          {loading ? (
            <div className="skeleton" style={{ height: 132 }} />
          ) : (
            <VolumeHistogram buckets={stats.buckets} />
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
              <SeverityBar data={stats.severity} />
            </div>
          )}
        </div>
      </div>

      {/* Stream */}
      <div className="animate-fade-up d6">
        <LogStream />
      </div>
    </AppShell>
  );
}

/** Group demo logs into hourly buckets so the chart has the same shape as the API's. */
function bucketize(logs: LogEntry[]): HistogramBucket[] {
  const HOUR = 3600_000;
  const map = new Map<number, HistogramBucket>();
  for (const l of logs) {
    const t = Math.floor(new Date(l.timestamp).getTime() / HOUR) * HOUR;
    if (!map.has(t)) map.set(t, { timestamp: t, count: 0, levels: {} });
    const b = map.get(t)!;
    b.count += 1;
    const k = l.level.toUpperCase();
    b.levels![k] = (b.levels![k] ?? 0) + 1;
  }
  // Demo logs span only a few seconds; spread them so the chart reads as a series.
  const arr = [...map.values()].sort((a, b) => a.timestamp - b.timestamp);
  if (arr.length === 1) {
    const base = arr[0].timestamp;
    return logs
      .reduce<HistogramBucket[]>((acc, l, i) => {
        const idx = Math.floor((i / logs.length) * 12);
        acc[idx] ??= { timestamp: base - (11 - idx) * HOUR, count: 0, levels: {} };
        acc[idx].count += 1;
        const k = l.level.toUpperCase();
        acc[idx].levels![k] = (acc[idx].levels![k] ?? 0) + 1;
        return acc;
      }, [])
      .filter(Boolean);
  }
  return arr;
}
