"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SEVERITY, SEVERITY_ORDER, Severity, compactNumber } from "../../lib/severity";

export interface HistogramBucket {
  timestamp: number;
  count: number;
  levels?: Record<string, number>;
}

const INTERVAL_LABEL: Record<string, string> = {
  minute: "events / minute",
  hour: "events / hour",
  day: "events / day",
  week: "events / week",
};

// Below this rendered width per slot, bars stop reading as bars and start
// reading as speckled noise -- merge buckets instead of letting them shrink.
const MIN_SLOT_PX = 14;

/** Merges consecutive buckets into `groupSize`-wide groups, summing counts and levels. */
function downsample(buckets: HistogramBucket[], groupSize: number): HistogramBucket[] {
  if (groupSize <= 1) return buckets;
  const merged: HistogramBucket[] = [];
  for (let i = 0; i < buckets.length; i += groupSize) {
    const group = buckets.slice(i, i + groupSize);
    const levels: Record<string, number> = {};
    for (const b of group) {
      for (const [k, v] of Object.entries(b.levels ?? {})) levels[k] = (levels[k] ?? 0) + v;
    }
    merged.push({
      timestamp: group[0].timestamp,
      count: group.reduce((n, b) => n + b.count, 0),
      levels,
    });
  }
  return merged;
}

/** Human label for a merged bucket span, since a fixed interval string no longer describes it once buckets are merged for legibility. */
function spanLabel(ms: number): string {
  const min = ms / 60_000;
  if (min < 90) return min <= 1.5 ? "events / minute" : `events / ${Math.round(min)} min`;
  const hr = ms / 3_600_000;
  if (hr < 36) return hr <= 1.5 ? "events / hour" : `events / ${Math.round(hr)} hr`;
  const day = ms / 86_400_000;
  if (day < 10) return day <= 1.5 ? "events / day" : `events / ${Math.round(day)} d`;
  const week = ms / (7 * 86_400_000);
  return week <= 1.5 ? "events / week" : `events / ${Math.round(week)} wk`;
}

/**
 * Volume over time, stacked by severity. Columns capped at 24px with a 2px
 * surface gap between stack segments and between adjacent columns.
 * Hover is shipped by default -- an SVG chart is interactive. Drag across
 * bars to brush-zoom, if `onBrush` is provided (F13).
 */
export default function VolumeHistogram({
  buckets,
  height = 132,
  interval = "hour",
  onBrush,
}: {
  buckets: HistogramBucket[];
  height?: number;
  /** Must match what the backend actually bucketed by -- never hardcode this. */
  interval?: string;
  onBrush?: (startMs: number, endMs: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const dragging = dragStart !== null;

  const plotRef = useRef<HTMLDivElement>(null);
  const [plotWidth, setPlotWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = plotRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => setPlotWidth(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Below MIN_SLOT_PX per bar, bars stop reading as bars -- merge buckets
  // rather than let them shrink into invisible slivers on narrow screens.
  const groupSize =
    plotWidth && buckets.length > 0 ? Math.max(1, Math.ceil(buckets.length / Math.max(1, Math.floor(plotWidth / MIN_SLOT_PX)))) : 1;
  const displayBuckets = useMemo(() => downsample(buckets, groupSize), [buckets, groupSize]);
  const merged = groupSize > 1;

  useEffect(() => {
    if (!dragging) return;
    function onMouseUp() {
      if (dragStart !== null && dragEnd !== null && dragStart !== dragEnd && onBrush) {
        const lo = Math.min(dragStart, dragEnd);
        const hi = Math.max(dragStart, dragEnd);
        const bucketMs = displayBuckets.length > 1 ? displayBuckets[1].timestamp - displayBuckets[0].timestamp : 3_600_000;
        onBrush(displayBuckets[lo].timestamp, displayBuckets[hi].timestamp + bucketMs);
      }
      setDragStart(null);
      setDragEnd(null);
    }
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [dragging, dragStart, dragEnd, displayBuckets, onBrush]);

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

  const max = Math.max(...displayBuckets.map((b) => b.count), 1);
  // Round the axis top to something clean rather than the raw max.
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const axisTop = Math.ceil(max / step) * step;

  const active = hover !== null ? displayBuckets[hover] : null;
  const mergedSpanMs = merged && displayBuckets.length > 1 ? displayBuckets[1].timestamp - displayBuckets[0].timestamp : null;

  return (
    <div className="relative">
      {/* Axis top tick */}
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
          {compactNumber(axisTop)}
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          {mergedSpanMs ? spanLabel(mergedSpanMs) : (INTERVAL_LABEL[interval] ?? `events / ${interval}`)}
        </span>
      </div>

      {/* Plot */}
      <div
        ref={plotRef}
        className="relative flex items-end"
        style={{
          height,
          gap: 2,
          borderBottom: "1px solid var(--border-default)",
          borderTop: "1px solid var(--grid-line)",
          userSelect: dragging ? "none" : undefined,
        }}
        onMouseLeave={() => setHover(null)}
      >
        {/* midline gridline */}
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{ bottom: "50%", height: 1, background: "var(--grid-line)" }}
        />

        {/* brush selection overlay */}
        {dragging && dragEnd !== null && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              left: `${(Math.min(dragStart!, dragEnd) / displayBuckets.length) * 100}%`,
              width: `${((Math.abs(dragEnd - dragStart!) + 1) / displayBuckets.length) * 100}%`,
              background: "var(--accent-dim)",
              border: "1px solid var(--accent)",
              zIndex: 5,
            }}
          />
        )}

        {displayBuckets.map((b, i) => {
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
              style={{ height: "100%", animationDelay: `${Math.min(i * 14, 350)}ms`, cursor: onBrush ? "col-resize" : undefined }}
              onMouseEnter={() => {
                setHover(i);
                if (dragging) setDragEnd(i);
              }}
              onMouseDown={() => onBrush && setDragStart(i)}
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
          {fmt(displayBuckets[0].timestamp)}
        </span>
        <span className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
          {fmt(displayBuckets[displayBuckets.length - 1].timestamp)}
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
