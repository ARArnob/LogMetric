"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";

/**
 * UX guard only -- redirects a caller without the required role away from
 * the page so they don't land on a screen full of failed requests. This
 * enforces nothing: every mutation the page could trigger is independently
 * checked server-side with @PreAuthorize. If this component vanished
 * entirely, the API would still refuse the same actions.
 */
export default function RoleGuard({ role, children }: { role: "ADMIN"; children: ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const { user, loading } = useAuth();
  const allowed = !!user && user.role === role;

  useEffect(() => {
    if (loading || allowed) return;
    toast.info("You don't have permission to view that page.");
    router.replace("/dashboard");
    // toast intentionally omitted -- its identity changes on every toast
    // add/remove, which would re-fire this redirect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, allowed, router]);

  if (loading || !allowed) return null;

  return <>{children}</>;
}
