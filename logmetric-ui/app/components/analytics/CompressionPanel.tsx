"use client";

import { useEffect, useState } from "react";
import { getCompressionStats, CompressionStatsResponse } from "../../lib/api";
import { AlertCircle, Database, CheckCircle2 } from "lucide-react";

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function formatNumber(num: number) {
  return new Intl.NumberFormat('en-US').format(num)
}

export function CompressionPanel() {
  const [stats, setStats] = useState<CompressionStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getCompressionStats();
        setStats(data);
      } catch (err: any) {
        setError(err.message || "Failed to load compression stats");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded mb-2"></div>
        <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-900 rounded mb-6"></div>
        <div className="h-24 bg-slate-100 dark:bg-slate-900 rounded"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="card p-5 border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900">
        <div className="flex items-center text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error || "Failed to load compression stats"}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="mb-6">
        <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Database className="h-5 w-5 text-indigo-500" />
          Cost & Compression Analytics
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Estimate storage savings by relying on pattern extraction instead of retaining raw full-text logs.
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg" style={{ background: "var(--bg-inset)" }}>
            <div className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
              Total Events Analyzed
            </div>
            <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {formatNumber(stats.totalEvents)}
            </div>
          </div>
          <div className="p-4 rounded-lg" style={{ background: "var(--bg-inset)" }}>
            <div className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
              Distinct Templates
            </div>
            <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {formatNumber(stats.distinctTemplates)}
            </div>
          </div>
          <div className="p-4 rounded-lg" style={{ background: "var(--bg-inset)" }}>
            <div className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
              Events Per Template
            </div>
            <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {stats.eventsPerTemplate.toFixed(1)}
            </div>
          </div>
          <div className="p-4 rounded-lg border" style={{ background: "var(--accent-dim)", borderColor: "var(--accent)" }}>
            <div className="text-sm mb-1 flex items-center gap-1" style={{ color: "var(--accent)" }}>
              <CheckCircle2 className="h-4 w-4" />
              Projected Savings
            </div>
            <div className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
              {stats.projectedSavingPercent.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-bold mb-3 flex items-center" style={{ color: "var(--text-primary)" }}>
              Storage Projection
              <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: "var(--bg-inset)", color: "var(--text-secondary)" }}>
                *Assumes retaining 5% of raw log bodies plus exact metadata and template strings.
              </span>
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Raw Volume (Estimated)</span>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{formatBytes(stats.rawBytes)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Unique Templates Size</span>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{formatBytes(stats.templateBytes)}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-t pt-2" style={{ borderColor: "var(--border-subtle)" }}>
                <span className="font-bold" style={{ color: "var(--text-primary)" }}>Projected Volume*</span>
                <span className="font-bold" style={{ color: "var(--accent)" }}>{formatBytes(stats.projectedBytesWithSampling)}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>
              Top Templates by Volume
            </h4>
            <div className="space-y-2">
              {stats.topTemplatesByVolume.length === 0 ? (
                <div className="text-sm italic" style={{ color: "var(--text-muted)" }}>
                  No templates recorded yet.
                </div>
              ) : (
                stats.topTemplatesByVolume.map((t, idx) => (
                  <div key={idx} className="text-xs flex items-center gap-2">
                    <div className="w-12 text-right shrink-0" style={{ color: "var(--text-secondary)" }}>
                      {t.sharePercent.toFixed(1)}%
                    </div>
                    <div 
                      className="truncate font-mono px-2 py-1 rounded flex-1"
                      title={t.template}
                      style={{ background: "var(--bg-inset)", color: "var(--text-primary)" }}
                    >
                      {t.template}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
