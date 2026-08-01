"use client";

import { useState } from "react";
import { ArrowLeft, GitBranch } from "lucide-react";
import VolumeHistogram from "../charts/VolumeHistogram";
import SeverityBar from "../charts/SeverityBar";
import LogTable from "../explorer/LogTable";
import LogDetailDrawer from "../explorer/LogDetailDrawer";
import EmptyState from "../ui/EmptyState";
import { useLogSearch } from "../../lib/useLogSearch";

/**
 * Everything here comes from one search filtered to a single patternHash --
 * the histogram, severity mix, and service list are the same aggregations
 * the overview uses, just naturally scoped by the filter.
 */
export default function ClusterDetail({ hash, onBack }: { hash: string; onBack: () => void }) {
  const { data, loading } = useLogSearch({ patternHash: hash, size: 50 }, { pollMs: 0 });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedLog = selectedIndex != null ? (data.logs[selectedIndex] ?? null) : null;

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="btn btn-ghost self-start" style={{ padding: "6px 12px", fontSize: 13 }}>
        <ArrowLeft className="w-3.5 h-3.5" />
        All patterns
      </button>

      <div className="card p-5 animate-fade-up">
        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <span
            className="font-mono text-xs px-2 py-0.5 rounded"
            style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
          >
            {hash}
          </span>
        </div>
        <p className="text-sm font-mono" style={{ color: "var(--text-primary)" }}>
          {loading ? "Loading sample…" : (data.logs[0]?.message ?? "No sample available")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="card card-sheen p-5 lg:col-span-2 animate-fade-up">
          <h2 className="text-sm font-bold mb-0.5" style={{ color: "var(--text-primary)" }}>
            Volume over time
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            This pattern only
          </p>
          {loading ? <div className="skeleton" style={{ height: 132 }} /> : <VolumeHistogram buckets={data.histogram} />}
        </div>

        <div className="card card-sheen p-5 flex flex-col animate-fade-up">
          <h2 className="text-sm font-bold mb-0.5" style={{ color: "var(--text-primary)" }}>
            Severity mix
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            For this pattern
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

      <div className="card card-sheen p-5 animate-fade-up">
        <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>
          Services touched
        </h2>
        <div className="flex flex-wrap gap-2">
          {data.serviceNames.length === 0 && !loading && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              No services recorded.
            </span>
          )}
          {data.serviceNames.map((s) => (
            <span
              key={s.name}
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
            >
              {s.name} <span style={{ color: "var(--text-muted)" }}>· {s.count}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="card card-sheen overflow-hidden animate-fade-up">
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            Member logs
          </h2>
        </div>
        {!loading && data.total === 0 ? (
          <EmptyState icon={<GitBranch className="w-6 h-6" />} title="No member logs found" />
        ) : (
          <LogTable
            logs={data.logs}
            loading={loading}
            density="comfortable"
            wrap={false}
            onRowClick={(_log, idx) => setSelectedIndex(idx)}
            selectedId={selectedLog?.id}
          />
        )}
      </div>

      <LogDetailDrawer
        log={selectedLog}
        onClose={() => setSelectedIndex(null)}
        onNavigate={(dir) => {
          if (selectedIndex == null) return;
          const next = dir === "prev" ? selectedIndex - 1 : selectedIndex + 1;
          if (next >= 0 && next < data.logs.length) setSelectedIndex(next);
        }}
        hasPrev={selectedIndex != null && selectedIndex > 0}
        hasNext={selectedIndex != null && selectedIndex < data.logs.length - 1}
      />
    </div>
  );
}
