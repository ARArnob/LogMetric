"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab/Shift+Tab focus inside the returned ref's element while `active`,
 * moves focus in on activation, and restores it to whatever was focused
 * before on deactivation. Escape calls onClose. Shared by Modal and Drawer
 * so both dialog types behave identically.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean, onClose: () => void) {
  const containerRef = useRef<T>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    const focusables = container ? Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
    (focusables[0] ?? container)?.focus();

    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // A nested open combobox/listbox (Select, MultiSelect) should have
        // Escape dismissed by its own popup, not close the whole dialog.
        // Checking e.target's focus isn't reliable here: clicking an option
        // in a MultiSelect (which stays open across multiple picks, unlike
        // Select) blurs the trigger button, since the dropdown's <li> items
        // aren't focusable -- so a DOM query for the open-popup marker both
        // components already set (aria-haspopup="listbox" + aria-expanded)
        // is used instead of relying on where focus currently is. Without
        // this, this listener's capture-phase stopPropagation() fires
        // before the popup's own (bubble-phase) Escape handler ever could.
        if (document.querySelector('[aria-haspopup="listbox"][aria-expanded="true"]')) {
          return;
        }
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !container) return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = "";
      previouslyFocused.current?.focus();
    };
  }, [active, onClose]);

  return containerRef;
}
