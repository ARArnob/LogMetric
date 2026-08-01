"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GitBranch, Activity } from "lucide-react";
import AppShell from "../components/AppShell";
import ClusterCard from "../components/patterns/ClusterCard";
import ClusterDetail from "../components/patterns/ClusterDetail";
import EmptyState from "../components/ui/EmptyState";
import { useRequireAuth } from "../lib/auth";
import { useLogSearch } from "../lib/useLogSearch";

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

  // Clusters are an aggregation over the whole matched set, independent of
  // pagination -- an unfiltered search is enough to populate the grid.
  const { data, loading } = useLogSearch({}, { pollMs: 0 });

  if (authLoading) return <LoadingScreen />;

  return (
    <AppShell
      title="Pattern Clusters"
      description="Every log is stripped of its variables and grouped by structural template."
    >
      {hash ? (
        <ClusterDetail hash={hash} onBack={() => router.push("/patterns")} />
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
              onClick={() => router.push(`/patterns?hash=${encodeURIComponent(cluster.patternHash)}`)}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
