import { createSimpleStore } from "./simpleStore";

/**
 * Bumped by api.ts whenever the server itself rejects a request with 401
 * (not the client-side "no token at all" guard clauses, which throw before
 * ever reaching the network). A dedicated listener component (mounted once
 * in the root layout, where useAuth/useToast/useRouter are all available)
 * reacts to this: real logout, a toast explaining why, and a redirect --
 * never a silent bounce.
 */
export const sessionExpiredStore = createSimpleStore(0);

export function signalSessionExpired(): void {
  sessionExpiredStore.set(sessionExpiredStore.get() + 1);
}
