"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Activity, Inbox, SearchX, Rows3, Rows4, WrapText, Key } from "lucide-react";
import Link from "next/link";
import AppShell from "../components/AppShell";
import FilterBar, { TIME_PRESETS } from "../components/explorer/FilterBar";
import LogTable from "../components/explorer/LogTable";
import LogDetailDrawer from "../components/explorer/LogDetailDrawer";
import EmptyState from "../components/ui/EmptyState";
import Pagination from "../components/ui/Pagination";
import { useRequireAuth } from "../lib/auth";
import { LogEntry, LogSearchRequest } from "../lib/api";
import { useLogSearch } from "../lib/useLogSearch";

const DENSITY_KEY = "logmetric_explorer_density";
const WRAP_KEY = "logmetric_explorer_wrap";
const DEFAULT_SIZE = 50;

function presetRange(id: string): { startDate?: number; endDate?: number } {
  const preset = TIME_PRESETS.find((p) => p.id === id);
  if (!preset || preset.id === "all") return { startDate: undefined, endDate: undefined };
  return { startDate: Date.now() - preset.ms, endDate: undefined };
}

function parseParams(params: URLSearchParams): { filters: LogSearchRequest; timeRangeId: string } {
  const timeRangeId = params.get("range") || "all";
  return {
    filters: {
      keyword: params.get("q") || undefined,
      levels: params.get("levels") ? params.get("levels")!.split(",") : undefined,
      serviceNames: params.get("services") ? params.get("services")!.split(",") : undefined,
      patternHash: params.get("patternHash") || undefined,
      page: params.get("page") ? Number(params.get("page")) : 0,
      size: params.get("size") ? Number(params.get("size")) : DEFAULT_SIZE,
      ...presetRange(timeRangeId),
    },
    timeRangeId,
  };
}

function toParams(filters: LogSearchRequest, timeRangeId: string): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.keyword) params.set("q", filters.keyword);
  if (filters.levels?.length) params.set("levels", filters.levels.join(","));
  if (filters.serviceNames?.length) params.set("services", filters.serviceNames.join(","));
  if (filters.patternHash) params.set("patternHash", filters.patternHash);
  if (timeRangeId !== "all") params.set("range", timeRangeId);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.size && filters.size !== DEFAULT_SIZE) params.set("size", String(filters.size));
  return params;
}

export default function ExplorerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-base)", color: "var(--text-muted)" }}>
          <div className="flex items-center gap-3 text-sm">
            <Activity className="w-4 h-4 animate-spin" style={{ color: "var(--accent)" }} />
            Loading…
          </div>
        </div>
      }
    >
      <ExplorerContent />
    </Suspense>
  );
}

function ExplorerContent() {
  const { loading: authLoading } = useRequireAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parsed once on mount -- the URL is the source of truth for the initial
  // state, so a filtered view survives a refresh and is shareable.
  const [{ filters: initialFilters, timeRangeId: initialTimeRangeId }] = useState(() => parseParams(searchParams));
  const [timeRangeId, setTimeRangeId] = useState(initialTimeRangeId);
  // Tracks the query string WE last wrote, so the "did the URL change
  // externally" effect below can tell a Link click or back/forward
  // navigation (must resync local state) apart from our own router.replace
  // calls (must not, or every keystroke would fight itself).
  const lastPushedRef = useRef(searchParams.toString());
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [wrap, setWrap] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setDensity((localStorage.getItem(DENSITY_KEY) as "comfortable" | "compact") || "comfortable");
    setWrap(localStorage.getItem(WRAP_KEY) === "true");
  }, []);

  // Explorer is investigative, not a live feed -- no background poll that
  // could silently reset the page the user is looking at.
  const { data, loading, error, filters, setFilters } = useLogSearch(initialFilters, { pollMs: 0 });

  // Keep the URL in sync so the view is shareable and survives a refresh.
  useEffect(() => {
    const qs = toParams(filters, timeRangeId).toString();
    lastPushedRef.current = qs;
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters, timeRangeId, pathname, router]);

  // Pick up URL changes we didn't cause ourselves -- a "Find similar" link,
  // browser back/forward, or a hand-edited URL, none of which remount this
  // component since it's the same route.
  useEffect(() => {
    const current = searchParams.toString();
    if (current === lastPushedRef.current) return;
    const { filters: parsed, timeRangeId: parsedRange } = parseParams(searchParams);
    setTimeRangeId(parsedRange);
    setFilters(parsed);
    setSelectedIndex(null);
    // setFilters intentionally omitted -- it's stable enough in practice, and
    // including it would re-run this whenever useLogSearch's internals change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTimeRangeChange = useCallback(
    (id: string) => {
      setTimeRangeId(id);
      setFilters({ ...presetRange(id), page: 0 });
    },
    [setFilters]
  );

  function toggleDensity() {
    const next = density === "comfortable" ? "compact" : "comfortable";
    setDensity(next);
    localStorage.setItem(DENSITY_KEY, next);
  }

  function toggleWrap() {
    const next = !wrap;
    setWrap(next);
    localStorage.setItem(WRAP_KEY, String(next));
  }

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (filters.keyword) {
      chips.push({ key: "kw", label: `"${filters.keyword}"`, onRemove: () => setFilters({ keyword: undefined, page: 0 }) });
    }
    for (const level of filters.levels ?? []) {
      chips.push({
        key: `lvl-${level}`,
        label: level,
        onRemove: () => setFilters({ levels: (filters.levels ?? []).filter((l) => l !== level), page: 0 }),
      });
    }
    for (const svc of filters.serviceNames ?? []) {
      chips.push({
        key: `svc-${svc}`,
        label: svc,
        onRemove: () => setFilters({ serviceNames: (filters.serviceNames ?? []).filter((s) => s !== svc), page: 0 }),
      });
    }
    if (filters.patternHash) {
      chips.push({
        key: "hash",
        label: `pattern ${filters.patternHash.slice(0, 8)}`,
        onRemove: () => setFilters({ patternHash: undefined, page: 0 }),
      });
    }
    if (timeRangeId !== "all") {
      const preset = TIME_PRESETS.find((p) => p.id === timeRangeId);
      chips.push({ key: "range", label: preset?.label ?? timeRangeId, onRemove: () => handleTimeRangeChange("all") });
    }
    return chips;
  }, [filters, timeRangeId, setFilters, handleTimeRangeChange]);

  function clearAll() {
    setTimeRangeId("all");
    setFilters({ keyword: undefined, levels: undefined, serviceNames: undefined, patternHash: undefined, page: 0 });
  }

  const size = filters.size || DEFAULT_SIZE;
  const page = filters.page || 0;
  const pageCount = Math.max(1, Math.ceil(data.total / size));
  const hasNoFiltersAtAll = activeChips.length === 0;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-base)", color: "var(--text-muted)" }}>
        <div className="flex items-center gap-3 text-sm">
          <Activity className="w-4 h-4 animate-spin" style={{ color: "var(--accent)" }} />
          Loading…
        </div>
      </div>
    );
  }

  const selectedLog: LogEntry | null = selectedIndex != null ? (data.logs[selectedIndex] ?? null) : null;

  return (
    <AppShell title="Log Explorer" description="Search the full index -- every filter runs server-side against Elasticsearch.">
      <div className="flex flex-col gap-4">
        <FilterBar
          keyword={filters.keyword ?? ""}
          onKeywordChange={(v) => setFilters({ keyword: v || undefined, page: 0 })}
          levels={filters.levels ?? []}
          onLevelsChange={(v) => setFilters({ levels: v.length ? v : undefined, page: 0 })}
          services={filters.serviceNames ?? []}
          onServicesChange={(v) => setFilters({ serviceNames: v.length ? v : undefined, page: 0 })}
          serviceOptions={data.serviceNames}
          severityOptions={data.severityDistribution}
          timeRangeId={timeRangeId}
          onTimeRangeChange={handleTimeRangeChange}
        />

        {error && (
          <div className="text-sm px-1" style={{ color: "var(--sev-error-text)" }}>
            {error}
          </div>
        )}

        {/* Active filter chips + result count + density/wrap toggles */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                onClick={chip.onRemove}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-dim)" }}
              >
                {chip.label}
                <span aria-hidden>×</span>
              </button>
            ))}
            {activeChips.length > 0 && (
              <button onClick={clearAll} className="text-xs underline" style={{ color: "var(--text-muted)" }}>
                Clear all
              </button>
            )}
            <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
              {loading ? "Searching…" : `${data.total.toLocaleString()} event${data.total === 1 ? "" : "s"} matched`}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleDensity}
              className="btn btn-quiet"
              style={{ padding: 6 }}
              title={density === "comfortable" ? "Switch to compact rows" : "Switch to comfortable rows"}
              aria-label="Toggle row density"
            >
              {density === "comfortable" ? <Rows3 className="w-3.5 h-3.5" /> : <Rows4 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={toggleWrap}
              className="btn btn-quiet"
              style={{ padding: 6, color: wrap ? "var(--accent)" : undefined }}
              title={wrap ? "Truncate long messages" : "Wrap long messages"}
              aria-label="Toggle message wrapping"
            >
              <WrapText className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="card card-sheen overflow-hidden">
          {!loading && data.total === 0 && hasNoFiltersAtAll ? (
            <EmptyState
              icon={<Inbox className="w-6 h-6" />}
              title="No logs in this organization yet"
              description="Generate an API key in Settings and send your first event -- it'll show up here immediately."
              action={
                <Link href="/settings" className="btn btn-primary mt-1">
                  <Key className="w-3.5 h-3.5" />
                  Go to Settings
                </Link>
              }
            />
          ) : !loading && data.total === 0 ? (
            <EmptyState
              icon={<SearchX className="w-6 h-6" />}
              title="No results for these filters"
              description="Try widening the time range or removing a filter."
              action={
                <button onClick={clearAll} className="btn btn-ghost mt-1">
                  Clear filters
                </button>
              }
            />
          ) : (
            <LogTable
              logs={data.logs}
              loading={loading}
              density={density}
              wrap={wrap}
              onRowClick={(_log, idx) => setSelectedIndex(idx)}
              selectedId={selectedLog?.id}
            />
          )}

          {data.total > 0 && (
            <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <Pagination
                page={page}
                pageCount={pageCount}
                total={data.total}
                pageSize={size}
                onPageChange={(p) => setFilters({ page: p })}
                onPageSizeChange={(s) => setFilters({ size: s, page: 0 })}
              />
            </div>
          )}
        </div>
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
    </AppShell>
  );
}
