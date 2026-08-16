"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { DEFAULT_TONE, isSectionTone, type SectionTone } from "@/lib/constants/section-tone";

/**
 * Animated backdrop for the public site.
 *
 * Two things are going on:
 *
 * 1. **Theme.** The same three drifting colour fields render in both themes,
 *    but light mode adds soft angled light shafts and dark mode a slow star
 *    field. Both layers are always in the DOM and switched with `opacity` in
 *    CSS (`.dark .ambient-rays` / `.dark .ambient-stars`), so nothing here has
 *    to read the theme — which also means no wrong-mode flash on hydration.
 *
 * 2. **Section colour.** Whichever section is crossing the middle of the
 *    viewport hands its `data-tone` to the backdrop, and the registered
 *    `--tone` / `--tone-soft` properties cross-fade to it over ~900ms. The
 *    background is therefore tinted by wherever the reader currently is.
 *
 * The observer's `rootMargin` collapses the root down to a thin band across the
 * viewport's middle, so "current section" means "the one under the reader's
 * eyeline", not "the one that happens to be tallest".
 */

/** Only the middle 10% of the viewport counts as "here". */
const MIDDLE_BAND = "-45% 0px -45% 0px";

export function AmbientBackground() {
  const pathname = usePathname();
  const [resolved, setResolved] = useState<{ path: string; tone: SectionTone } | null>(null);

  /*
   * The observed tone is stored with the route it came from and compared during
   * render rather than reset from the effect. A navigation replaces every
   * anchor on the page, and the stale route's colour would otherwise sit on the
   * backdrop until the new observer had something to report — or forever, on a
   * route with no toned sections at all.
   */
  const tone = resolved?.path === pathname ? resolved.tone : DEFAULT_TONE;

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-tone-anchor]"));
    if (sections.length === 0) return;

    const inBand = new Set<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target);
          else inBand.delete(entry.target);
        }

        // Document order breaks the tie while two sections share the band.
        const current = sections.find((section) => inBand.has(section));
        // No match means the reader is between sections; holding the last tone
        // is calmer than snapping back to the default and out again.
        if (current && isSectionTone(current.dataset.tone)) {
          setResolved({ path: pathname, tone: current.dataset.tone });
        }
      },
      { rootMargin: MIDDLE_BAND, threshold: 0 },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <div aria-hidden="true" className="ambient" data-tone={tone}>
      <div className="ambient-blob ambient-blob-a" />
      <div className="ambient-blob ambient-blob-b" />
      <div className="ambient-blob ambient-blob-c" />
      <div className="ambient-rays" />
      <div className="ambient-stars" />
    </div>
  );
}
