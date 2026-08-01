"use client";

import { useState } from "react";
import { SEVERITY, SEVERITY_ORDER, Severity, compactNumber } from "../../lib/severity";

export interface HistogramBucket {
  timestamp: number;
  count: number;
  levels?: Record<string, number>;
}

/**
 * Volume over time, stacked by severity. Columns capped at 24px with a 2px
 * surface gap between stack segments and between adjacent columns.
 * Hover is shipped by default -- an SVG chart is interactive.
 */
export default function VolumeHistogram({
  buckets,
  height = 132,
}: {
  buckets: HistogramBucket[];
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (!buckets.length) {
    return (
      <div
        className="flex items-center justify-center rounded-lg"
        style={{ height, background: "var(--bg-inset)", border: "1px solid var(--border-subtle)" }}
      >
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          No volume data in range
        </p>
      </div>
    );
  }

  const max = Math.max(...buckets.map((b) => b.count), 1);
  // Round the axis top to something clean rather than the raw max.
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const axisTop = Math.ceil(max / step) * step;

  const active = hover !== null ? buckets[hover] : null;

  return (
    <div className="relative">
      {/* Axis top tick */}
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
          {compactNumber(axisTop)}
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          events / hour
        </span>
      </div>

      {/* Plot */}
      <div
        className="relative flex items-end"
        style={{
          height,
          gap: 2,
          borderBottom: "1px solid var(--border-default)",
          borderTop: "1px solid var(--grid-line)",
        }}
        onMouseLeave={() => setHover(null)}
      >
        {/* midline gridline */}
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{ bottom: "50%", height: 1, background: "var(--grid-line)" }}
        />

        {buckets.map((b, i) => {
          const isHover = hover === i;
          const totalH = (b.count / axisTop) * height;
          const levels = b.levels ?? {};
          const segs = SEVERITY_ORDER.map((s) => ({ s, v: levels[s] ?? 0 })).filter((x) => x.v > 0);
          const segTotal = segs.reduce((n, x) => n + x.v, 0);

          return (
            // The slot takes an equal share of the width; the bar inside is
            // capped at 24px and centred, so the leftover reads as even air
            // between columns rather than a gap at the right edge.
            <div
              key={i}
              className="relative flex-1 flex flex-col justify-end items-center grow-up"
              style={{ height: "100%", animationDelay: `${Math.min(i * 14, 350)}ms` }}
              onMouseEnter={() => setHover(i)}
            >
              {/* invisible full-height hit target: hover shouldn't require hitting a thin bar */}
              <div className="absolute inset-0" style={{ cursor: "default" }} />

              {segs.length > 0 ? (
                <div
                  className="flex flex-col justify-end w-full"
                  style={{ height: Math.max(totalH, 2), gap: 2, maxWidth: 24 }}
                >
                  {segs.map(({ s, v }, si) => (
                    <div
                      key={s}
                      style={{
                        height: `${(v / segTotal) * 100}%`,
                        minHeight: 2,
                        background: SEVERITY[s as Severity].color,
                        opacity: hover === null || isHover ? 1 : 0.4,
                        borderRadius: si === 0 ? "3px 3px 0 0" : 0,
                        transition: "opacity 0.15s ease",
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className="w-full"
                  style={{
                    height: Math.max(totalH, 2),
                    maxWidth: 24,
                    background: "var(--accent)",
                    opacity: hover === null || isHover ? 0.85 : 0.35,
                    borderRadius: "3px 3px 0 0",
                    transition: "opacity 0.15s ease",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Time range footer */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
          {fmt(buckets[0].timestamp)}
        </span>
        <span className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
          {fmt(buckets[buckets.length - 1].timestamp)}
        </span>
      </div>

      {/* Tooltip */}
      {active && (
        <div
          className="absolute card pointer-events-none"
          style={{
            top: -4,
            right: 0,
            padding: "8px 10px",
            zIndex: 20,
            minWidth: 148,
            boxShadow: "var(--shadow-lift)",
          }}
        >
          <div className="text-[10px] mb-1.5 tabular-nums" style={{ color: "var(--text-muted)" }}>
            {fmtFull(active.timestamp)}
          </div>
          <div className="text-sm font-bold mb-1.5" style={{ color: "var(--text-primary)" }}>
            {active.count.toLocaleString()} events
          </div>
          {SEVERITY_ORDER.filter((s) => (active.levels?.[s] ?? 0) > 0).map((s) => (
            <div key={s} className="flex items-center gap-1.5 text-[11px]">
              <span
                className="rounded-sm shrink-0"
                style={{ width: 7, height: 7, background: SEVERITY[s].color }}
              />
              <span className="flex-1" style={{ color: "var(--text-secondary)" }}>
                {SEVERITY[s].label}
              </span>
              <span className="tabular-nums font-semibold" style={{ color: "var(--text-primary)" }}>
                {active.levels?.[s]?.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function fmt(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtFull(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
