"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  HistogramBucket,
  LogSearchRequest,
  LogSearchResponse,
  fetchDemoLogs,
  isDemoMode,
  searchLogs,
} from "./api";
import { useAuth } from "./auth";

const KEYWORD_DEBOUNCE_MS = 300;
const HOUR_MS = 3600_000;

/** Mirrors LogSearchService#resolveHistogramResolution so the demo-mode chart
 * scales its bucket width to the selected range the same way real data does
 * (previously demo mode always reported "hour" no matter what range was picked). */
const INTERVAL_MS = { minute: 60_000, hour: HOUR_MS, day: 24 * HOUR_MS, week: 7 * 24 * HOUR_MS } as const;
type DemoInterval = keyof typeof INTERVAL_MS;

function resolveDemoInterval(startDate?: number, endDate?: number): DemoInterval {
  if (startDate == null) return "week";
  const spanMs = (endDate ?? Date.now()) - startDate;
  if (spanMs <= 3 * HOUR_MS) return "minute";
  if (spanMs <= 3 * 24 * HOUR_MS) return "hour";
  if (spanMs <= 60 * 24 * HOUR_MS) return "day";
  return "week";
}

function emptyResponse(): LogSearchResponse {
  return { logs: [], total: 0, histogram: [], severityDistribution: [], serviceNames: [], patternClusters: [], histogramInterval: "hour" };
}

/** Groups demo logs into buckets of the given interval, same shape the API's date histogram returns. */
function bucketizeDemo(logs: LogSearchResponse["logs"], interval: DemoInterval): HistogramBucket[] {
  const bucketMs = INTERVAL_MS[interval];
  const map = new Map<number, HistogramBucket>();
  for (const l of logs) {
    const t = Math.floor(new Date(l.timestamp).getTime() / bucketMs) * bucketMs;
    if (!map.has(t)) map.set(t, { timestamp: t, count: 0, levels: {} });
    const bucket = map.get(t)!;
    bucket.count += 1;
    const level = l.level.toUpperCase();
    bucket.levels[level] = (bucket.levels[level] ?? 0) + 1;
  }

  const arr = [...map.values()].sort((a, b) => a.timestamp - b.timestamp);
  // Demo logs span only a few seconds, so they'd otherwise collapse into a
  // single bucket -- spread them across synthetic slots (at the resolved
  // interval's width) so the chart still reads as a time series.
  if (arr.length === 1) {
    const base = arr[0].timestamp;
    return logs.reduce<HistogramBucket[]>((acc, l, i) => {
      const idx = Math.floor((i / logs.length) * 12);
      acc[idx] ??= { timestamp: base - (11 - idx) * bucketMs, count: 0, levels: {} };
      acc[idx].count += 1;
      const level = l.level.toUpperCase();
      acc[idx].levels[level] = (acc[idx].levels[level] ?? 0) + 1;
      return acc;
    }, []);
  }
  return arr;
}

/** Shapes synthetic demo data into the same response the real API returns, so every consumer has one code path regardless of mode. */
function demoResponse(size: number, startDate?: number, endDate?: number): LogSearchResponse {
  const logs = fetchDemoLogs(size);
  const severity = new Map<string, number>();
  const services = new Map<string, number>();

  for (const l of logs) {
    const level = l.level.toUpperCase();
    severity.set(level, (severity.get(level) ?? 0) + 1);
    services.set(l.serviceName, (services.get(l.serviceName) ?? 0) + 1);
  }

  const interval = resolveDemoInterval(startDate, endDate);

  return {
    logs,
    total: logs.length,
    histogram: bucketizeDemo(logs, interval),
    severityDistribution: [...severity].map(([level, count]) => ({ level, count })),
    serviceNames: [...services].map(([name, count]) => ({ name, count })),
    patternClusters: [],
    histogramInterval: interval,
  };
}

export interface UseLogSearchResult {
  data: LogSearchResponse;
  loading: boolean;
  error: string | null;
  filters: LogSearchRequest;
  setFilters: (patch: Partial<LogSearchRequest>) => void;
  refresh: () => void;
}

/**
 * Single owner of log-search state: one in-flight request at a time (a new
 * call aborts the previous one), a debounced keyword filter, a shared poll
 * interval, and demo-mode data shaped identically to the real response.
 * The dashboard and the live stream both read from one instance of this
 * instead of each polling /logs/search independently.
 */
export function useLogSearch(
  initial: LogSearchRequest = { size: 200 },
  options: { pollMs?: number } = {}
): UseLogSearchResult {
  const { pollMs = 20000 } = options;
  const { token, loading: authLoading } = useAuth();
  const demoView = isDemoMode && !token;

  const [filters, setFiltersState] = useState<LogSearchRequest>(initial);
  const [data, setData] = useState<LogSearchResponse>(emptyResponse());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtersRef = useRef(initial);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Background polls shouldn't re-flash a loading skeleton -- only the very
  // first request (or a request after an error) should block on "loading".
  const hasLoadedRef = useRef(false);

  const run = useCallback(
    async (nextFilters: LogSearchRequest) => {
      if (demoView) {
        setData(demoResponse(nextFilters.size ?? 60, nextFilters.startDate, nextFilters.endDate));
        setError(null);
        setLoading(false);
        hasLoadedRef.current = true;
        return;
      }
      if (!token) return;

      // A new request supersedes whatever's still in flight -- out-of-order
      // responses (e.g. a slow request for a filter the user already changed)
      // must never be allowed to overwrite newer state.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (!hasLoadedRef.current) setLoading(true);

      try {
        const response = await searchLogs(nextFilters, { signal: controller.signal });
        setData(response);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) {
          // searchLogs() already signaled the global session-expiry flow
          // (logout + toast + redirect) -- nothing more to do here.
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to fetch logs");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          hasLoadedRef.current = true;
        }
      }
    },
    [demoView, token]
  );

  const setFilters = useCallback(
    (patch: Partial<LogSearchRequest>) => {
      setFiltersState((prev) => {
        const next = { ...prev, ...patch };
        filtersRef.current = next;

        clearTimeout(debounceRef.current);
        const keywordChanged = patch.keyword !== undefined && patch.keyword !== prev.keyword;
        if (keywordChanged) {
          debounceRef.current = setTimeout(() => run(next), KEYWORD_DEBOUNCE_MS);
        } else {
          run(next);
        }
        return next;
      });
    },
    [run]
  );

  const refresh = useCallback(() => run(filtersRef.current), [run]);

  useEffect(() => {
    if (authLoading) return;
    run(filtersRef.current);
    // pollMs <= 0 opts out of background polling -- e.g. a paginated
    // Explorer view shouldn't have its page silently reset out from under
    // the user every 20s the way a live dashboard should refresh.
    const id = pollMs > 0 ? setInterval(() => run(filtersRef.current), pollMs) : undefined;
    return () => {
      if (id) clearInterval(id);
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [authLoading, demoView, token, pollMs, run]);

  return { data, loading, error, filters, setFilters, refresh };
}
