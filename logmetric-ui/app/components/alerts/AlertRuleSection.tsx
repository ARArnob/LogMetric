"use client";

import { useCallback, useEffect, useState } from "react";
import { BellPlus } from "lucide-react";
import EmptyState from "../ui/EmptyState";
import AlertRuleForm from "./AlertRuleForm";
import AlertRuleList from "./AlertRuleList";
import {
  AlertRule,
  AlertRuleInput,
  ApiError,
  TeamUser,
  createAlertRule,
  listAlertRules,
  listUsers,
  updateAlertRule,
} from "../../lib/api";
import { useToast } from "../../lib/toast";

export default function AlertRuleSection({ isAdmin }: { isAdmin: boolean }) {
  const toast = useToast();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [members, setMembers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AlertRule | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    try {
      const [ruleList, userList] = await Promise.all([listAlertRules(), listUsers()]);
      setRules(ruleList);
      setMembers(userList);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load alert rules");
    } finally {
      setLoading(false);
    }
    // toast intentionally omitted, same reasoning as TeamContent's fetchUsers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  if (!isAdmin) {
    return (
      <div className="card p-5">
        <h2 className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          Alert rules
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Only an admin can create or change alert rules for this organization. Ask an admin to
          set one up -- once a rule exists, everyone here sees it fire in the live feed below.
        </p>
      </div>
    );
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(rule: AlertRule) {
    setEditing(rule);
    setFormOpen(true);
  }

  async function handleSubmit(input: AlertRuleInput) {
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateAlertRule(editing.id, input);
        setRules((list) => list.map((r) => (r.id === updated.id ? updated : r)));
        toast.success(`"${updated.name}" updated`);
      } else {
        const created = await createAlertRule(input);
        setRules((list) => [...list, created]);
        toast.success(`"${created.name}" created`);
      }
      setFormOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save the rule");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: rules.length > 0 || loading ? "1px solid var(--border-subtle)" : "none" }}
      >
        <div>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            Alert rules
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Threshold rules over error rate, traffic volume, or payload entropy.
          </p>
        </div>
        <button onClick={openCreate} className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }}>
          <BellPlus className="w-3.5 h-3.5" />
          New rule
        </button>
      </div>

      {loading ? (
        <div className="p-5 flex flex-col gap-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 40 }} />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <EmptyState
          icon={<BellPlus className="w-6 h-6" />}
          title="No rules yet"
          description="Create one to start getting paged for error spikes, traffic anomalies, or obfuscated payloads."
        />
      ) : (
        <AlertRuleList
          rules={rules}
          setRules={setRules}
          onEdit={openEdit}
          onDeleted={(id) => setRules((list) => list.filter((r) => r.id !== id))}
        />
      )}

      <AlertRuleForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        editing={editing}
        members={members}
        saving={saving}
      />
    </div>
  );
}
