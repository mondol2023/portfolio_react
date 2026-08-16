"use client";

import { useSyncExternalStore } from "react";

/** No external store to watch — the value only ever changes once, at hydration. */
const subscribe = () => () => {};

/**
 * `false` while rendering on the server and during the hydration pass, `true`
 * afterwards.
 *
 * Use it to gate anything whose value the server cannot know — the resolved
 * colour theme, `window` dimensions — so the first client render matches the
 * server HTML exactly and React has nothing to complain about. This is the
 * `useSyncExternalStore` form of the pattern rather than `useState` +
 * `useEffect`, which avoids a second render pass.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
