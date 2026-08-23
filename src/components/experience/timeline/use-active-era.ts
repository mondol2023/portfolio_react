"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Which role card is centred in the viewport right now.
 *
 * Mirrors `useActiveSection`'s "highest intersection ratio wins" approach,
 * but that hook is keyed to the page's fixed nav section ids — this one
 * tracks an arbitrary count of entries local to the timeline, so it's
 * colocated here rather than generalised into `lib/hooks`.
 *
 * `registerEra(index)` returns a ref callback; hand it to each entry's root
 * element and the observer does the rest. The index is stamped onto the node
 * itself (`dataset.eraIndex`) so the callback is the only place a consumer
 * has to mention it.
 */

interface ActiveEra {
  activeIndex: number;
  /**
   * False until the first entry has actually crossed the centre band. Callers
   * that fire an effect *on arrival* at an era need this, because
   * `activeIndex` starts at 0 whether or not era 0 has been reached — without
   * it the first card's glitch would play while the section is still off
   * screen and nobody would ever see it.
   */
  entered: boolean;
  registerEra: (index: number) => (node: HTMLElement | null) => void;
}

export function useActiveEra(count: number): ActiveEra {
  const nodes = useRef(new Map<number, HTMLElement>());
  const [activeIndex, setActiveIndex] = useState(0);
  const [entered, setEntered] = useState(false);

  // Cached per index, so a re-render (and this hook re-renders on every era
  // change) does not hand React a fresh callback for every card and make it
  // detach and re-attach the whole list's refs.
  const callbacks = useRef(new Map<number, (node: HTMLElement | null) => void>());

  function registerEra(index: number) {
    const existing = callbacks.current.get(index);
    if (existing) return existing;

    const callback = (node: HTMLElement | null) => {
      if (node) {
        node.dataset.eraIndex = String(index);
        nodes.current.set(index, node);
      } else {
        nodes.current.delete(index);
      }
    };

    callbacks.current.set(index, callback);
    return callback;
  }

  useEffect(() => {
    const ratios = new Map<number, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number(entry.target.getAttribute("data-era-index"));
          ratios.set(index, entry.intersectionRatio);
        }

        let best = 0;
        let bestRatio = -1;
        for (const [index, ratio] of ratios) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = index;
          }
        }

        // Only move on a real intersection — otherwise every entry leaving the
        // band at once (e.g. a resize) would collapse the active era to 0.
        if (bestRatio > 0) {
          setActiveIndex(best);
          setEntered(true);
        }
      },
      // A band through the middle of the viewport: an entry counts as "active"
      // once it crosses the centre, not merely once it's visible at all.
      { rootMargin: "-40% 0px -40% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    for (const node of nodes.current.values()) observer.observe(node);
    return () => observer.disconnect();
  }, [count]);

  return { activeIndex, entered, registerEra };
}
