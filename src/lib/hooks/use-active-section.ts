"use client";

import { useEffect, useState } from "react";

/**
 * Scroll-spy for the single-page nav.
 *
 * One `IntersectionObserver` watches every section at once — far cheaper than a
 * scroll handler measuring `getBoundingClientRect()` per section per frame.
 *
 * The `rootMargin` shrinks the viewport to a band just below the fixed header,
 * so a section counts as "active" while it occupies the reading area rather
 * than the instant its first pixel appears.
 */
export function useActiveSection(sectionIds: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio);
          } else {
            visible.delete(entry.target.id);
          }
        }

        // Document order breaks ties, so scrolling never jumps backwards
        // through the nav when two sections are equally visible.
        let best: string | null = null;
        let bestRatio = 0;
        for (const id of sectionIds) {
          const ratio = visible.get(id);
          if (ratio !== undefined && ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }

        if (best) setActive(best);
      },
      { rootMargin: "-96px 0px -55% 0px", threshold: [0, 0.15, 0.35, 0.6, 1] },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [sectionIds]);

  return active;
}
