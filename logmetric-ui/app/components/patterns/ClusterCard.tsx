"use client";

import { PatternCluster } from "../../lib/api";
import { SEVERITY, SEVERITY_ORDER, compactNumber } from "../../lib/severity";

/**
 * A cluster is a group, not a log line -- the headline number is the event
 * count across every service it touched, not a single representative row.
 */
export default function ClusterCard({ cluster, onClick }: { cluster: PatternCluster; onClick: () => void }) {
  const segments = SEVERITY_ORDER.map((lvl) => ({ lvl, count: cluster.levels[lvl] ?? 0 })).filter((s) => s.count > 0);
  const segmentTotal = segments.reduce((sum, s) => sum + s.count, 0) || cluster.count;

  return (
    <button
      onClick={onClick}
      className="card card-interactive card-sheen p-4 text-left w-full flex flex-col gap-3"
    >
      <p
        className="text-sm font-mono line-clamp-2"
        style={{ color: "var(--text-primary)", minHeight: "2.6em" }}
      >
        {cluster.sampleMessage || "(no sample available)"}
      </p>

      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="text-2xl font-extrabold leading-none" style={{ color: "var(--text-primary)" }}>
          {compactNumber(cluster.count)}
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          event{cluster.count === 1 ? "" : "s"}
          {cluster.serviceCount ? ` across ${cluster.serviceCount} service${cluster.serviceCount === 1 ? "" : "s"}` : ""}
        </span>
      </div>

      {segments.length > 0 && (
        <div className="flex w-full" style={{ height: 6, gap: 1 }}>
          {segments.map(({ lvl, count }) => (
            <div
              key={lvl}
              style={{
                width: `${(count / segmentTotal) * 100}%`,
                background: SEVERITY[lvl].color,
                borderRadius: 2,
              }}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-auto">
        {cluster.dominantService ? (
          <span className="text-xs font-semibold truncate" style={{ color: "var(--accent)" }}>
            {cluster.dominantService}
          </span>
        ) : (
          <span />
        )}
        <span
          className="font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0"
          style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
        >
          {cluster.patternHash.slice(0, 8)}
        </span>
      </div>
    </button>
  );
}
