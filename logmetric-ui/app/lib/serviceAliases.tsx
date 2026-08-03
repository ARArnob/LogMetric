"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { listServiceAliases } from "./api";
import { useAuth } from "./auth";

interface ServiceAliasContextValue {
  /** Looks up the admin-set display label for a raw serviceName; falls back to the raw name (or "") if there's no alias. Never mutates filter/aggregation keys -- display only. */
  resolveServiceName: (rawName: string | null | undefined) => string;
  /** Re-fetches the org's alias list -- call after an admin adds/edits/removes one. */
  refresh: () => Promise<void>;
}

const ServiceAliasContext = createContext<ServiceAliasContextValue | undefined>(undefined);

export function ServiceAliasProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [aliasMap, setAliasMap] = useState<Map<string, string>>(new Map());

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const aliases = await listServiceAliases();
      setAliasMap(new Map(aliases.map((a) => [a.rawServiceName, a.displayName])));
    } catch {
      // A failed background fetch just means raw names render until the next refresh -- not worth surfacing as an error.
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setAliasMap(new Map());
      return;
    }
    refresh();
  }, [token, refresh]);

  const resolveServiceName = useCallback(
    (rawName: string | null | undefined) => {
      if (!rawName) return rawName ?? "";
      return aliasMap.get(rawName) ?? rawName;
    },
    [aliasMap]
  );

  return (
    <ServiceAliasContext.Provider value={{ resolveServiceName, refresh }}>
      {children}
    </ServiceAliasContext.Provider>
  );
}

export function useServiceAliases(): ServiceAliasContextValue {
  const ctx = useContext(ServiceAliasContext);
  if (!ctx) {
    throw new Error("useServiceAliases must be used within a ServiceAliasProvider");
  }
  return ctx;
}
