"use client";

import { useState } from "react";
import { Building2, Pencil, Check, X } from "lucide-react";
import { ApiError, updateOrganizationName } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/toast";

export default function OrganizationSection() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === "ADMIN";

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setName(user?.organizationName ?? "");
    setEditing(true);
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await updateOrganizationName(trimmed);
      await refreshUser();
      setEditing(false);
      toast.success("Organization renamed");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't rename the organization");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          Organization
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
            Name
          </div>
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") setEditing(false);
                }}
                disabled={saving}
                className="text-sm"
                style={{ padding: "4px 8px" }}
              />
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="p-1 rounded disabled:opacity-50"
                style={{ color: "var(--ok)" }}
                aria-label="Save organization name"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setEditing(false)}
                disabled={saving}
                className="p-1 rounded"
                style={{ color: "var(--text-muted)" }}
                aria-label="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {user?.organizationName ?? "—"}
              </span>
              {isAdmin && (
                <button
                  onClick={startEdit}
                  className="p-1 rounded"
                  style={{ color: "var(--text-muted)" }}
                  aria-label="Rename organization"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
            Your role
          </div>
          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {user?.role ?? "—"}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
            Signed in as
          </div>
          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {user?.email ?? "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
