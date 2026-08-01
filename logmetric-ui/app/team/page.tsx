"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Users } from "lucide-react";
import AppShell from "../components/AppShell";
import RoleGuard from "../components/RoleGuard";
import UserTable from "../components/team/UserTable";
import InviteCard from "../components/team/InviteCard";
import EmptyState from "../components/ui/EmptyState";
import { ApiError, TeamUser, listUsers } from "../lib/api";
import { useAuth, useRequireAuth } from "../lib/auth";
import { useToast } from "../lib/toast";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-base)", color: "var(--text-muted)" }}>
      <div className="flex items-center gap-3 text-sm">
        <Activity className="w-4 h-4 animate-spin" style={{ color: "var(--accent)" }} />
        Loading…
      </div>
    </div>
  );
}

function TeamContent() {
  const { user } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      setUsers(await listUsers());
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load the team");
    } finally {
      setLoading(false);
    }
    // toast intentionally omitted -- its identity changes on every toast
    // add/remove, which would re-trigger this fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const currentUserId = users.find((u) => u.email === user?.email)?.id;

  return (
    <AppShell title="Team" description="Manage who has access to this organization and what they can do.">
      <div className="flex flex-col gap-4 max-w-3xl">
        <InviteCard />

        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              Members
            </h2>
          </div>
          {loading ? (
            <div className="p-5 flex flex-col gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 40 }} />
              ))}
            </div>
          ) : users.length === 0 ? (
            <EmptyState icon={<Users className="w-6 h-6" />} title="No members yet" />
          ) : (
            <UserTable users={users} setUsers={setUsers} currentUserId={currentUserId} onRefresh={fetchUsers} />
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default function TeamPage() {
  const { loading } = useRequireAuth();

  if (loading) return <LoadingScreen />;

  return (
    <RoleGuard role="ADMIN">
      <TeamContent />
    </RoleGuard>
  );
}
