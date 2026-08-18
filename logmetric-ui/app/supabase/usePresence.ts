"use client";

import { useEffect, useState } from "react";
import { supabase } from "./client";

export interface PresentViewer {
  email: string;
  online_at: string;
}

/**
 * Tracks who else is currently viewing this organization's dashboard via a
 * Supabase Realtime Presence channel (one channel per org, so tenants never
 * see each other -- mirrors the org scoping the rest of the app already
 * enforces server-side). Returns an empty list whenever Supabase isn't
 * configured or the user isn't authenticated, so callers can render nothing
 * instead of branching on setup state.
 */
export function usePresence(organizationId: number | undefined, email: string | undefined) {
  const [viewers, setViewers] = useState<PresentViewer[]>([]);

  useEffect(() => {
    if (!supabase || !organizationId || !email) {
      setViewers([]);
      return;
    }
    const client = supabase;

    const channel = client.channel(`org-presence-${organizationId}`, {
      config: { presence: { key: email } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresentViewer>();
        const present = Object.values(state)
          .flat()
          .map((entry) => ({ email: entry.email, online_at: entry.online_at }));
        setViewers(present);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ email, online_at: new Date().toISOString() });
          void logPresenceEvent(organizationId, email, "join");
        }
      });

    return () => {
      void logPresenceEvent(organizationId, email, "leave");
      client.removeChannel(channel);
    };
  }, [organizationId, email]);

  return viewers;
}

/**
 * Best-effort audit trail in the presence_events table (see
 * supabase/schema.sql). Swallows errors: presence itself works over the
 * Realtime channel above regardless of whether this insert succeeds, so a
 * missing table or an RLS rejection shouldn't break the indicator.
 */
async function logPresenceEvent(organizationId: number, email: string, event: "join" | "leave") {
  if (!supabase) return;
  try {
    await supabase.from("presence_events").insert({ organization_id: organizationId, email, event });
  } catch {
    // non-critical: audit log only
  }
}
