"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tracks scroll direction for the auto-hiding navbar.
 *
 * Two guards keep the header from flickering:
 *  - `delta` — direction only flips after the pointer has actually travelled a
 *    meaningful distance, so trackpad jitter and rubber-band scrolling are
 *    ignored.
 *  - `topOffset` — near the top of the document the header is always shown,
 *    regardless of direction, because hiding it there feels like a glitch.
 *
 * Reads happen inside `requestAnimationFrame`, so the scroll listener never
 * forces a synchronous layout.
 */

export type ScrollDirection = "up" | "down";

interface Options {
  /** Minimum travel, in px, before the direction is allowed to change. */
  delta?: number;
  /** Distance from the top, in px, within which the header stays pinned. */
  topOffset?: number;
}

export interface ScrollState {
  direction: ScrollDirection;
  /** True while the page is scrolled past `topOffset`. */
  isScrolled: boolean;
  /** True when the header should be visible. */
  isAtTop: boolean;
}

export function useScrollDirection({ delta = 8, topOffset = 64 }: Options = {}): ScrollState {
  const [state, setState] = useState<ScrollState>({
    direction: "up",
    isScrolled: false,
    isAtTop: true,
  });

  // Refs, not state: these change on every frame and must not trigger renders.
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastY.current = window.scrollY;

    function update() {
      ticking.current = false;
      const y = Math.max(window.scrollY, 0);
      const travelled = y - lastY.current;

      if (Math.abs(travelled) < delta && y > topOffset) return;

      const direction: ScrollDirection = travelled > 0 ? "down" : "up";
      lastY.current = y;

      setState((previous) => {
        const next: ScrollState = {
          direction,
          isScrolled: y > topOffset,
          isAtTop: y <= topOffset,
        };

        // Bail out of identical updates so the header does not re-render on
        // every frame of a long scroll.
        if (
          previous.direction === next.direction &&
          previous.isScrolled === next.isScrolled &&
          previous.isAtTop === next.isAtTop
        ) {
          return previous;
        }
        return next;
      });
    }

    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [delta, topOffset]);

  return state;
}
