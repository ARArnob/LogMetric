"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

export const THEMES = ["midnight", "daylight", "amber"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_META: Record<Theme, { label: string; blurb: string }> = {
  midnight: { label: "Midnight", blurb: "Deep navy, cyan accent" },
  daylight: { label: "Daylight", blurb: "Clean light, blue accent" },
  amber: { label: "Amber CRT", blurb: "Phosphor terminal" },
};

export const THEME_STORAGE_KEY = "logmetric_theme";

/**
 * Runs before first paint (injected into <head>) so the stored theme is
 * stamped on <html> without a flash of the default theme.
 */
export const themeInitScript = `
(function(){try{
  var t = localStorage.getItem('${THEME_STORAGE_KEY}');
  if(!t){ t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'daylight' : 'midnight'; }
  document.documentElement.setAttribute('data-theme', t);
}catch(e){ document.documentElement.setAttribute('data-theme','midnight'); }})();
`;

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Starts as the SSR default; the effect below syncs it to whatever the
  // pre-paint script already stamped, so no flash and no hydration mismatch.
  const [theme, setThemeState] = useState<Theme>("midnight");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") as Theme | null;
    if (current && (THEMES as readonly string[]).includes(current)) {
      setThemeState(current);
    }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      // storage unavailable (private mode) -- theme still applies for this session
    }
    setThemeState(t);
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
