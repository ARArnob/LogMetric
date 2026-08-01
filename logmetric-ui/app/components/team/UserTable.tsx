"use client";

import { useState } from "react";
import { ShieldCheck, User as UserIcon } from "lucide-react";
import Badge from "../ui/Badge";
import ConfirmDialog from "../ui/ConfirmDialog";
import { ApiError, TeamUser, updateUserRole } from "../../lib/api";
import { useToast } from "../../lib/toast";

export default function UserTable({
  users,
  setUsers,
  currentUserId,
  onRefresh,
}: {
  users: TeamUser[];
  setUsers: React.Dispatch<React.SetStateAction<TeamUser[]>>;
  currentUserId: number | undefined;
  onRefresh: () => void;
}) {
  const toast = useToast();
  const [pending, setPending] = useState<{ user: TeamUser; nextRole: "ADMIN" | "USER" } | null>(null);
  const [saving, setSaving] = useState(false);

  async function confirmChange() {
    if (!pending) return;
    const { user, nextRole } = pending;
    const previous = users;
    setUsers((list) => list.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u)));
    setSaving(true);
    try {
      const updated = await updateUserRole(user.id, nextRole);
      setUsers((list) => list.map((u) => (u.id === updated.id ? updated : u)));
      toast.success(`${user.email} is now ${nextRole === "ADMIN" ? "an admin" : "a member"}`);
      setPending(null);
    } catch (err) {
      // Roll back the optimistic update -- the server rejected the change,
      // so the UI must not keep showing a role that was never actually set.
      setUsers(previous);
      const status = err instanceof ApiError ? err.status : 0;
      const message = err instanceof ApiError ? err.message : "Couldn't update role";
      toast.error(message);
      setPending(null);
      // A 403 here means the caller's own admin status changed underneath
      // them -- resync with the server instead of trusting local state.
      if (status === 403) onRefresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <th className="text-left px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Email
            </th>
            <th className="text-left px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Role
            </th>
            <th className="text-right px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            const nextRole: "ADMIN" | "USER" = u.role === "ADMIN" ? "USER" : "ADMIN";
            return (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td className="px-5 py-3" style={{ color: "var(--text-primary)" }}>
                  {u.email}
                </td>
                <td className="px-5 py-3">
                  <Badge variant={u.role === "ADMIN" ? "accent" : "neutral"}>
                    {u.role === "ADMIN" ? <ShieldCheck className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                    {u.role}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: "5px 10px" }}
                    disabled={isSelf}
                    title={isSelf ? "You can't change your own role -- ask another admin" : undefined}
                    onClick={() => setPending({ user: u, nextRole })}
                  >
                    {nextRole === "ADMIN" ? "Promote to admin" : "Demote to member"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={confirmChange}
        loading={saving}
        title={pending?.nextRole === "ADMIN" ? "Promote to admin?" : "Demote to member?"}
        message={
          pending
            ? pending.nextRole === "ADMIN"
              ? `${pending.user.email} will gain full admin access, including managing users, invites, and API keys.`
              : `${pending.user.email} will lose admin access, including managing users, invites, and API keys.`
            : ""
        }
        confirmLabel={pending?.nextRole === "ADMIN" ? "Promote" : "Demote"}
        danger={pending?.nextRole === "USER"}
      />
    </div>
  );
}
