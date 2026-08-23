"use client";

import { useEffect, useState } from "react";

/**
 * Reports whether the page is being scrolled *down*, for chrome that gets out
 * of the way.
 *
 * Deliberately reports only the raw scroll answer. Whether the bar is actually
 * hidden is a render-time decision at the call site (`hidden = away && !pinned`),
 * because the other reasons to stay put — an open menu, focus inside the bar —
 * are the caller's to know, and folding them in here would mean writing state
 * from an effect, which this repo's lint rejects outright.
 *
 * Reads `window.scrollY` rather than subscribing to Lenis. Lenis moves the
 * window scroll position, so the native `scroll` event is the same signal one
 * layer down, and the bar keeps working on the routes Lenis never mounts on.
 */

/** Within this much of the top, the bar is always shown. */
const REVEAL_ABOVE = 8;
/** Never hide before this far down: the bar must not flinch on the first nudge. */
const HIDE_AFTER = 96;
/** Movement under this is jitter, a trackpad settling, or an overscroll bounce. */
const THRESHOLD = 6;

export function useScrolledAway(): boolean {
  const [away, setAway] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;

    function read() {
      frame = 0;
      const y = window.scrollY;
      const delta = y - last;

      // `last` only advances once the threshold is cleared, so a slow drag
      // still accumulates into a direction instead of being filtered away.
      if (Math.abs(delta) < THRESHOLD) return;
      last = y;

      if (y <= REVEAL_ABOVE) setAway(false);
      else if (delta > 0 && y > HIDE_AFTER) setAway(true);
      else if (delta < 0) setAway(false);
    }

    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(read);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return away;
}
