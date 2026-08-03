"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Server, Key, ArrowRight, Boxes } from "lucide-react";
import AppShell from "../components/AppShell";
import EmptyState from "../components/ui/EmptyState";
import Badge from "../components/ui/Badge";
import SeverityBar from "../components/charts/SeverityBar";
import {
  ApiError,
  ApiKeyInfo,
  SeverityBucket,
  ServiceBucket,
  SystemInfo,
  listApiKeys,
  listSystems,
  searchLogs,
} from "../lib/api";
import { useAuth, useRequireAuth } from "../lib/auth";
import { useToast } from "../lib/toast";

interface SystemStats {
  total: number;
  severityDistribution: SeverityBucket[];
  serviceNames: ServiceBucket[];
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

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function TopologyContent() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === "ADMIN";
  const [systems, setSystems] = useState<SystemInfo[]>([]);
  const [stats, setStats] = useState<Record<number, SystemStats>>({});
  const [keyCounts, setKeyCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const systemList = await listSystems();
      setSystems(systemList);

      // One search per system, size:1 -- only the total + aggregations are
      // needed, not member logs (size:0 throws on the backend --
      // PageRequest.of(page, 0) rejects a zero page size), and there's no
      // cross-system aggregation endpoint (orgs have few enough systems for
      // this to be cheap).
      const statEntries = await Promise.all(
        systemList.map(async (s) => {
          const result = await searchLogs({ systemId: String(s.id), size: 1 });
          return [s.id, { total: result.total, severityDistribution: result.severityDistribution, serviceNames: result.serviceNames }] as const;
        })
      );
      setStats(Object.fromEntries(statEntries));

      if (isAdmin) {
        const keys = await listApiKeys();
        const counts: Record<number, number> = {};
        for (const k of keys) {
          if (k.systemId != null && !k.revoked) counts[k.systemId] = (counts[k.systemId] ?? 0) + 1;
        }
        setKeyCounts(counts);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load topology");
    } finally {
      setLoading(false);
    }
    // toast intentionally omitted -- see the same pattern elsewhere in this codebase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <AppShell title="Topology" description="Every system in this organization, and how much it's carrying.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 220 }} />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Topology" description="Every system in this organization, and how much it's carrying.">
      {systems.length === 0 ? (
        <EmptyState
          icon={<Boxes className="w-6 h-6" />}
          title="No systems yet"
          description="A system is what an API key belongs to. Create one in Settings to start ingesting logs and see it show up here."
          action={
            <Link href="/settings" className="btn btn-primary mt-1">
              <Server className="w-3.5 h-3.5" />
              Go to Settings
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {systems.map((s) => {
            const stat = stats[s.id];
            const topServices = (stat?.serviceNames ?? []).slice(0, 3);
            return (
              <div key={s.id} className="card p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Server className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
                      <h2 className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                        {s.name}
                      </h2>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      created {formatCreatedAt(s.createdAt)}
                    </p>
                  </div>
                  {isAdmin && (
                    <Badge variant="neutral">
                      <Key className="w-3 h-3" />
                      {keyCounts[s.id] ?? 0} active
                    </Badge>
                  )}
                </div>

                <div className="flex-1">
                  <SeverityBar data={stat?.severityDistribution ?? []} />
                </div>

                {topServices.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {topServices.map((svc) => (
                      <Badge key={svc.name} variant="neutral">
                        {svc.name} · {svc.count.toLocaleString()}
                      </Badge>
                    ))}
                  </div>
                )}

                <Link
                  href={`/explorer?systemId=${s.id}`}
                  className="flex items-center gap-1 text-xs font-semibold mt-4"
                  style={{ color: "var(--accent)", textDecoration: "none" }}
                >
                  View in Explorer
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

export default function TopologyPage() {
  const { loading } = useRequireAuth();

  if (loading) return <LoadingScreen />;

  return <TopologyContent />;
}
