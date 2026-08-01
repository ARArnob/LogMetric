"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GitBranch, Activity } from "lucide-react";
import AppShell from "../components/AppShell";
import ClusterCard from "../components/patterns/ClusterCard";
import ClusterDetail from "../components/patterns/ClusterDetail";
import EmptyState from "../components/ui/EmptyState";
import TimeRangePicker, { TimeRangeValue, presetRange } from "../components/TimeRangePicker";
import { useRequireAuth } from "../lib/auth";
import { useLogSearch } from "../lib/useLogSearch";

const RANGE_STORAGE_KEY = "logmetric_patterns_range";

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

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-base)", color: "var(--text-muted)" }}>
      <div className="flex items-center gap-3 text-sm">
        <Activity className="w-4 h-4 animate-spin" style={{ color: "var(--accent)" }} />
        Loading…
      </div>
    </div>
  );
}

export default function PatternsPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PatternsContent />
    </Suspense>
  );
}

function PatternsContent() {
  const { loading: authLoading } = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hash = searchParams.get("hash");

  const [range, setRange] = useState<TimeRangeValue>(() => readInitialRange(searchParams));

  // Clusters are an aggregation over the whole matched set, independent of
  // pagination -- an unfiltered (besides range) search is enough to populate the grid.
  const { data, loading, setFilters } = useLogSearch({ startDate: range.startDate, endDate: range.endDate }, { pollMs: 0 });

  function buildUrl(extra: Record<string, string | undefined>): string {
    const params = rangeToParams(range);
    for (const [k, v] of Object.entries(extra)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/patterns?${qs}` : "/patterns";
  }

  function handleRangeChange(next: TimeRangeValue) {
    setRange(next);
    setFilters({ startDate: next.startDate, endDate: next.endDate });
    try {
      localStorage.setItem(RANGE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable -- range still applies for this session
    }
    const params = rangeToParams(next);
    if (hash) params.set("hash", hash);
    const qs = params.toString();
    router.replace(qs ? `/patterns?${qs}` : "/patterns", { scroll: false });
  }

  if (authLoading) return <LoadingScreen />;

  return (
    <AppShell
      title="Pattern Clusters"
      description="Every log is stripped of its variables and grouped by structural template."
    >
      {!hash && (
        <div className="flex justify-end mb-4">
          <TimeRangePicker value={range} onChange={handleRangeChange} />
        </div>
      )}
      {hash ? (
        <ClusterDetail hash={hash} onBack={() => router.push(buildUrl({}))} />
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 160 }} />
          ))}
        </div>
      ) : data.patternClusters.length === 0 ? (
        <EmptyState
          icon={<GitBranch className="w-6 h-6" />}
          title="No patterns yet"
          description="Once logs are ingested, LogMetric strips their variables and groups structurally identical events here -- so 500 near-duplicate errors read as one cluster instead of 500 rows."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up">
          {data.patternClusters.map((cluster) => (
            <ClusterCard
              key={cluster.patternHash}
              cluster={cluster}
              onClick={() => router.push(buildUrl({ hash: cluster.patternHash }))}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
