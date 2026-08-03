"use client";

import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface StatTrend {
  direction: "up" | "down" | "flat";
  text: string;
  /** Whether this direction is a good or bad thing for this particular metric -- "up" isn't always bad (e.g. active services), so the tile can't infer color from direction alone. */
  tone: "good" | "bad" | "neutral";
}

/**
 * Stat tile contract: label (sentence case) + value + optional sub + optional
 * sparkline. The value wears text ink, not a data color -- the small colored
 * icon beside it carries identity.
 */
export default function StatTile({
  label,
  value,
  sub,
  icon,
  accent = "var(--accent)",
  accentDim = "var(--accent-dim)",
  spark,
  trend,
  loading = false,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  accent?: string;
  accentDim?: string;
  spark?: number[];
  trend?: StatTrend;
  loading?: boolean;
}) {
  // A flat sparkline reads as a stray rule, not a chart -- only draw it when
  // there is actual variation to show.
  const showSpark =
    !!spark && spark.length > 1 && Math.max(...spark) !== Math.min(...spark);

  return (
    <div className="card card-interactive card-sheen p-4 h-full flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
          {label}
        </span>
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ background: accentDim, color: accent }}
        >
          {icon}
        </div>
      </div>

      {loading ? (
        <>
          <div className="skeleton" style={{ height: 28, width: "60%", marginBottom: 6 }} />
          <div className="skeleton" style={{ height: 12, width: "40%" }} />
        </>
      ) : (
        <>
          <div
            className="text-2xl font-extrabold leading-none mb-1.5"
            style={{ color: "var(--text-primary)" }}
          >
            {value}
          </div>
          {sub && (
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {sub}
            </div>
          )}
          {trend && (
            <div
              className="flex items-center gap-1 text-xs font-semibold mt-1"
              style={{
                color:
                  trend.tone === "bad"
                    ? "var(--sev-error-text)"
                    : trend.tone === "good"
                      ? "var(--ok-text)"
                      : "var(--text-muted)",
              }}
            >
              {trend.direction === "up" ? (
                <TrendingUp className="w-3 h-3" />
              ) : trend.direction === "down" ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              {trend.text}
            </div>
          )}
        </>
      )}

      {showSpark && !loading && (
        <div className="mt-auto pt-3">
          <Sparkline data={spark!} color={accent} />
        </div>
      )}
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 100;
  const h = 22;
  const max = Math.max(...data, 1);
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height: 22, overflow: "visible" }}
      aria-hidden="true"
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        opacity={0.9}
      />
    </svg>
  );
}
