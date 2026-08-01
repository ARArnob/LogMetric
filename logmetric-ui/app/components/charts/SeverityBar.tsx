"use client";

import { useState } from "react";
import { SEVERITY, SEVERITY_ORDER, Severity, compactNumber } from "../../lib/severity";

export interface SeverityDatum {
  level: string;
  count: number;
}

/**
 * Part-to-whole across 4 status classes -> horizontal stacked bar.
 * A 2px surface-colored gap separates segments (never a stroke).
 * Legend is always present: identity is never carried by color alone.
 */
export default function SeverityBar({ data }: { data: SeverityDatum[] }) {
  const [hover, setHover] = useState<string | null>(null);

  const counts = new Map<string, number>();
  for (const d of data) {
    const key = d.level?.toUpperCase();
    if (key) counts.set(key, (counts.get(key) ?? 0) + d.count);
  }

  const present = SEVERITY_ORDER.filter((s) => (counts.get(s) ?? 0) > 0);
  const total = present.reduce((sum, s) => sum + (counts.get(s) ?? 0), 0);

  if (total === 0) {
    return (
      <div className="flex flex-col h-full" style={{ minHeight: 108 }}>
        <div
          className="rounded-full w-full"
          style={{ height: 14, background: "var(--bg-inset)", border: "1px solid var(--border-subtle)" }}
        />
        <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
          No events in range
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Headline figure -- gives the card weight and states the denominator */}
      <div className="mb-4">
        <div className="text-3xl font-extrabold leading-none" style={{ color: "var(--text-primary)" }}>
          {compactNumber(total)}
        </div>
        <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          total events classified
        </div>
      </div>

      {/* Stacked bar */}
      <div className="flex w-full" style={{ height: 14, gap: 2 }}>
        {present.map((s, i) => {
          const count = counts.get(s) ?? 0;
          const pct = (count / total) * 100;
          const faded = hover !== null && hover !== s;
          return (
            <div
              key={s}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(null)}
              title={`${SEVERITY[s].label}: ${count.toLocaleString()} (${pct.toFixed(1)}%)`}
              style={{
                width: `${pct}%`,
                background: SEVERITY[s].color,
                opacity: faded ? 0.35 : 1,
                borderRadius:
                  present.length === 1
                    ? 7
                    : i === 0
                      ? "7px 2px 2px 7px"
                      : i === present.length - 1
                        ? "2px 7px 7px 2px"
                        : 2,
                transition: "opacity 0.15s ease",
                cursor: "default",
              }}
            />
          );
        })}
      </div>

      {/* Legend -- swatch + text label, so identity never depends on hue */}
      <div className="flex flex-wrap gap-x-5 gap-y-2.5 mt-4">
        {present.map((s) => {
          const count = counts.get(s) ?? 0;
          const pct = (count / total) * 100;
          const faded = hover !== null && hover !== s;
          return (
            <div
              key={s}
              className="flex items-center gap-2"
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(null)}
              style={{ opacity: faded ? 0.45 : 1, transition: "opacity 0.15s ease" }}
            >
              <span
                className="rounded-sm shrink-0"
                style={{ width: 9, height: 9, background: SEVERITY[s].color }}
              />
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                {SEVERITY[s].label}
              </span>
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: "var(--text-primary)" }}
              >
                {compactNumber(count)}
              </span>
              <span className="text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                {pct.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
