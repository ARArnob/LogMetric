"use client";

import { useState } from "react";
import Link from "next/link";
import { Server, Plus, Trash2 } from "lucide-react";
import ConfirmDialog from "../ui/ConfirmDialog";
import { ApiError, SystemInfo, createSystem, deleteSystem } from "../../lib/api";
import { useToast } from "../../lib/toast";

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export default function SystemSection({
  isAdmin,
  systems,
  loading,
  onRefresh,
}: {
  isAdmin: boolean;
  systems: SystemInfo[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const toast = useToast();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SystemInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await createSystem(trimmed);
      setNewName("");
      toast.success("System created");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't create the system");
    } finally {
      setCreating(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteSystem(pendingDelete.id);
      toast.success(`"${pendingDelete.name}" deleted`);
      onRefresh();
    } catch (err) {
      // A 409 here names exactly how many active keys are blocking it --
      // surface that verbatim rather than a generic failure message. Close
      // the dialog either way -- leaving it open behind a toast just traps
      // the admin behind a modal they'd have to manually cancel.
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete the system");
    } finally {
      setPendingDelete(null);
      setDeleting(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Server className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            Systems
          </h2>
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Only an admin can create or remove systems for this organization.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Server className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          Systems
        </h2>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
        A system is what an API key actually belongs to -- separate services can each get their
        own key and show up separately on{" "}
        <Link href="/topology" style={{ color: "var(--accent)" }}>
          Topology
        </Link>
        .
      </p>

      <div className="flex items-center gap-2 mb-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="e.g. payments-service"
          disabled={creating}
          className="flex-1 text-sm"
          style={{ padding: "6px 10px" }}
          aria-label="New system name"
        />
        <button onClick={handleCreate} disabled={creating || !newName.trim()} className="btn btn-primary" style={{ fontSize: 13 }}>
          <Plus className="w-3.5 h-3.5" />
          Create
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 36 }} />
          ))}
        </div>
      ) : systems.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          No systems yet -- create one above before generating a key below.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {systems.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--bg-inset)" }}
            >
              <div className="min-w-0">
                <div className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                  {s.name}
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  created {formatCreatedAt(s.createdAt)}
                </div>
              </div>
              <button
                className="btn btn-ghost shrink-0"
                style={{ fontSize: 12, padding: "4px 8px" }}
                onClick={() => setPendingDelete(s)}
                aria-label={`Delete system ${s.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        danger
        title="Delete this system?"
        message={
          pendingDelete
            ? `"${pendingDelete.name}" will be removed. If it still has an active API key, this will be rejected -- revoke the key first in the API keys section below.`
            : ""
        }
        confirmLabel="Delete"
      />
    </div>
  );
}
