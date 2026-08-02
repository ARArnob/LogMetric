"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthUser, clearStoredAuth, getCurrentUser, getStoredAuth, setStoredAuth, updateStoredUser } from "./api";

const ROLE_REFRESH_MS = 30000;

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  login: (token: string, user: AuthUser, persistent?: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored) {
      setToken(stored.token);
      setUser(stored.user);
    }
    setLoading(false);
  }, []);

  const login = useCallback((newToken: string, newUser: AuthUser, persistent = true) => {
    setStoredAuth({ token: newToken, user: newUser }, persistent);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
  }, []);

  // Re-reads the caller's own role/org from the DB, so a demotion (or
  // promotion) made in another tab/session is reflected here without
  // waiting for the JWT to expire or the user to re-login. Any error here
  // (network hiccup or a real 401) is swallowed -- a 401 already triggers
  // the global session-expiry flow via getCurrentUser's own
  // signalSessionExpired() call (see SessionExpiryHandler), so there's no
  // need to duplicate that reaction here.
  const refreshUser = useCallback(async () => {
    try {
      const fresh = await getCurrentUser();
      updateStoredUser(fresh);
      setUser(fresh);
    } catch {
      // handled globally, or just a transient network error -- either way,
      // nothing to do here.
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    refreshUser();
    const interval = setInterval(refreshUser, ROLE_REFRESH_MS);
    return () => clearInterval(interval);
    // refreshUser is stable (depends only on the stable `logout`); re-running
    // this effect only on `token` change avoids restarting the interval on
    // every refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

/** Redirects to /signin once the stored auth has been checked and none was found. */
export function useRequireAuth(): { loading: boolean } {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !token) router.replace("/signin");
  }, [loading, token, router]);

  return { loading: loading || !token };
}
