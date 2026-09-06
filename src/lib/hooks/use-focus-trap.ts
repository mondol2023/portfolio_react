"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Traps Tab focus inside `panelRef` while `active`, locks background scroll,
 * moves focus into the panel on open, and returns it to `triggerRef` on
 * close. Escape calls `onClose`.
 *
 * Extracted from the hand-rolled pattern in `mobile-menu.tsx` (which predates
 * this hook and still owns its own copy) for use anywhere a modal can't rely
 * on native `<dialog>` — e.g. a Motion `layoutId` shared-element expansion,
 * where the "dialog" is really just an absolutely-positioned `motion.div`.
 */

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(
  panelRef: RefObject<HTMLElement | null>,
  active: boolean,
  onClose: () => void,
  triggerRef?: RefObject<HTMLElement | null>,
) {
  // Kept in a ref so an unmemoized `onClose` from the caller doesn't force
  // the effect below to tear down and rebuild (which would re-lock scroll
  // and re-steal focus) on every render while the trap is active. Assigned in
  // its own effect rather than during render, per the rules of React.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!active) return;

    const trigger = triggerRef?.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;

      // Wrap focus at both ends so Tab can never escape into the inert page.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    // Move focus into the panel once it exists in the DOM.
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
    // panelRef/triggerRef are ref objects (stable identity); onClose is read
    // via onCloseRef so it doesn't need to be a dependency either.
  }, [active, panelRef, triggerRef]);
}
