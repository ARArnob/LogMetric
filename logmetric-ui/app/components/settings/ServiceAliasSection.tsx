"use client";

import { useEffect, useState } from "react";
import { Tag, Pencil, X, Check } from "lucide-react";
import { ApiError, deleteServiceAlias, searchLogs, upsertServiceAlias } from "../../lib/api";
import { useServiceAliases } from "../../lib/serviceAliases";
import { useToast } from "../../lib/toast";

export default function ServiceAliasSection({ isAdmin }: { isAdmin: boolean }) {
  const { resolveServiceName, refresh } = useServiceAliases();
  const toast = useToast();

  const [rawNames, setRawNames] = useState<string[] | null>(null);
  const [editingRaw, setEditingRaw] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busyRaw, setBusyRaw] = useState<string | null>(null);

  // Reuses the same "size:1, read the serviceNames aggregation" trick
  // CommandPalette already uses to list every service the org has seen,
  // regardless of the current page's filters.
  useEffect(() => {
    let cancelled = false;
    searchLogs({ size: 1 })
      .then((res) => {
        if (!cancelled) setRawNames(res.serviceNames.map((s) => s.name).filter(Boolean));
      })
      .catch(() => {
        if (!cancelled) setRawNames([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function startEdit(raw: string) {
    const current = resolveServiceName(raw);
    setDraft(current === raw ? "" : current);
    setEditingRaw(raw);
  }

  async function handleSave(raw: string) {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setBusyRaw(raw);
    try {
      await upsertServiceAlias(raw, trimmed);
      await refresh();
      setEditingRaw(null);
      toast.success("Alias saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save the alias");
    } finally {
      setBusyRaw(null);
    }
  }

  async function handleClear(raw: string) {
    setBusyRaw(raw);
    try {
      await deleteServiceAlias(raw);
      await refresh();
      toast.success("Alias cleared");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't clear the alias");
    } finally {
      setBusyRaw(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className="card p-5">
        <h2 className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          Service names
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Only an admin can set display names for services. Raw service names are shown until one
          is set.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Tag className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          Service names
        </h2>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
        Give a friendlier display name to any service seen in your logs. The raw name your
        services actually send is never changed -- this only affects how it&apos;s shown.
      </p>

      {rawNames === null ? (
        <div className="skeleton" style={{ height: 80 }} />
      ) : rawNames.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          No services seen yet -- ingest some logs first.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {rawNames.map((raw) => {
            const alias = resolveServiceName(raw);
            const hasAlias = alias !== raw;
            const isEditing = editingRaw === raw;
            const isBusy = busyRaw === raw;
            return (
              <div
                key={raw}
                className="flex items-center gap-2 py-2"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                <code
                  className="text-xs font-mono px-2 py-1 rounded shrink-0 truncate max-w-[40%]"
                  style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
                  title={raw}
                >
                  {raw}
                </code>
                <span style={{ color: "var(--text-muted)" }}>&rarr;</span>

                {isEditing ? (
                  <>
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave(raw);
                        if (e.key === "Escape") setEditingRaw(null);
                      }}
                      placeholder="Display name"
                      disabled={isBusy}
                      className="text-sm flex-1"
                      style={{ padding: "4px 8px" }}
                    />
                    <button
                      onClick={() => handleSave(raw)}
                      disabled={isBusy || !draft.trim()}
                      className="p-1 rounded disabled:opacity-50"
                      style={{ color: "var(--ok)" }}
                      aria-label={`Save alias for ${raw}`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingRaw(null)}
                      disabled={isBusy}
                      className="p-1 rounded"
                      style={{ color: "var(--text-muted)" }}
                      aria-label="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className="text-sm font-medium flex-1 truncate"
                      style={{ color: hasAlias ? "var(--text-primary)" : "var(--text-muted)" }}
                    >
                      {hasAlias ? alias : "(no alias set)"}
                    </span>
                    <button
                      onClick={() => startEdit(raw)}
                      disabled={isBusy}
                      className="p-1 rounded"
                      style={{ color: "var(--text-muted)" }}
                      aria-label={`Edit alias for ${raw}`}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    {hasAlias && (
                      <button
                        onClick={() => handleClear(raw)}
                        disabled={isBusy}
                        className="p-1 rounded"
                        style={{ color: "var(--sev-error-text)" }}
                        aria-label={`Clear alias for ${raw}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
