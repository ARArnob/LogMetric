"use client";

import { useCallback, useEffect, useState } from "react";
import { Key, AlertTriangle } from "lucide-react";
import ConfirmDialog from "../ui/ConfirmDialog";
import CopyButton from "../ui/CopyButton";
import Badge from "../ui/Badge";
import { ApiKeyInfo, API_BASE_URL, generateApiKey, listApiKeys } from "../../lib/api";
import { useToast } from "../../lib/toast";

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ApiKeySection({ isAdmin }: { isAdmin: boolean }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const toast = useToast();

  const refreshKeys = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setKeys(await listApiKeys());
    } catch {
      // Silent -- generation still works even if this list fails to load; a
      // toast for a background list refresh would be noise (same pattern as
      // InviteCard's outstanding-invites refresh).
    }
  }, [isAdmin]);

  useEffect(() => {
    refreshKeys();
  }, [refreshKeys]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const apiKey = await generateApiKey();
      setKey(apiKey);
      setConfirmOpen(false);
      toast.success("API key generated");
      refreshKeys();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't generate a key");
    } finally {
      setGenerating(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="card p-5">
        <h2 className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          API keys
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Only an admin can generate API keys for this organization. Ask an admin to generate one
          and share the ingestion command with you.
        </p>
      </div>
    );
  }

  // API_BASE_URL already ends in /api -- strip it back off so the displayed
  // curl command matches exactly what a real client would send.
  const ingestOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
  const snippet = key
    ? `curl -X POST ${ingestOrigin}/api/logs \\\n  -H "X-API-KEY: ${key}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"level":"INFO","serviceName":"my-service","message":"Hello from LogMetric"}'`
    : null;

  return (
    <div className="card p-5">
      <h2 className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>
        API keys
      </h2>
      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
        Generate a key to authenticate log ingestion from your services.
      </p>

      {!key ? (
        <button onClick={() => setConfirmOpen(true)} className="btn btn-primary">
          <Key className="w-3.5 h-3.5" />
          Generate API key
        </button>
      ) : (
        <div className="flex flex-col gap-4">
          <div
            className="flex items-start gap-2 p-3 rounded-lg text-xs"
            style={{ background: "var(--sev-warn-dim)", color: "var(--sev-warn-text)", border: "1px solid var(--sev-warn)" }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Copy this now.</strong> It&apos;s hashed on the server and cannot be shown again.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <code
              className="flex-1 font-mono text-sm px-3 py-2.5 rounded-lg overflow-x-auto"
              style={{ background: "var(--bg-inset)", color: "var(--text-primary)", border: "1px solid var(--border-default)" }}
            >
              {key}
            </code>
            <CopyButton value={key} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                Try it now
              </span>
              <CopyButton value={snippet!} label="Copy command" />
            </div>
            <pre
              className="text-xs font-mono p-3 rounded-lg overflow-x-auto whitespace-pre"
              style={{ background: "var(--bg-inset)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}
            >
              {snippet}
            </pre>
          </div>

          <button onClick={() => setConfirmOpen(true)} className="btn btn-ghost self-start" style={{ fontSize: 13 }}>
            Generate another key
          </button>
        </div>
      )}

      {keys.length > 0 && (
        <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
            Existing keys
          </h3>
          <ul className="flex flex-col gap-1.5">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--bg-inset)" }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <code className="font-mono text-xs truncate" style={{ color: "var(--text-primary)" }}>
                    {k.maskedHint}
                  </code>
                  {k.systemName && <Badge variant="neutral">{k.systemName}</Badge>}
                  {k.revoked && <Badge variant="error">Revoked</Badge>}
                </div>
                <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                  {formatCreatedAt(k.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
        A key&apos;s full value is only ever shown once, right after generation -- it&apos;s stored
        hashed and can&apos;t be retrieved again. If you lose one, generate a new one.
      </p>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleGenerate}
        title="Generate a new API key?"
        message="The key is shown once, right here. Anyone who has it can ingest logs into this organization -- store it somewhere safe."
        confirmLabel="Generate key"
        loading={generating}
      />
    </div>
  );
}
