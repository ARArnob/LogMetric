"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { sessionExpiredStore } from "../lib/sessionExpiry";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";

/**
 * The one place that reacts to a server-rejected 401 (see api.ts's
 * signalSessionExpired calls): real logout (clears the actual auth state,
 * not just storage), a toast explaining why, and a redirect. Mounted once
 * in the root layout -- never a silent bounce to /signin.
 */
export default function SessionExpiryHandler() {
  const signal = useSyncExternalStore(sessionExpiredStore.subscribe, sessionExpiredStore.get, () => 0);
  const { token, logout } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const lastHandled = useRef(0);

  useEffect(() => {
    if (signal === 0 || signal === lastHandled.current) return;
    lastHandled.current = signal;
    // Already signed out (e.g. a manual sign-out raced with a stale
    // in-flight request's 401) -- nothing new to announce.
    if (!token) return;

    logout();
    toast.error("Your session expired. Please sign in again.");
    router.push("/signin");
  }, [signal, token, logout, toast, router]);

  return null;
}
