"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribes to an arbitrary media query.
 *
 * The same `useSyncExternalStore` shape as `use-motion-preference`, generalised
 * for the interactive layer, which asks device questions that CSS alone cannot
 * answer in JavaScript — is this a fine pointer, is the viewport tall enough to
 * page. Server and first client render both return `serverValue`, so the markup
 * matches and the client corrects itself on hydration.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};

      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia) return serverValue;
    return window.matchMedia(query).matches;
  }, [query, serverValue]);

  const getServerSnapshot = useCallback(() => serverValue, [serverValue]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** True on devices driven by a mouse or trackpad — the ones that get a cursor. */
export function useFinePointer(): boolean {
  return useMediaQuery("(pointer: fine) and (hover: hover)");
}
