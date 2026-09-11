"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { SectionScenery } from "@/features/section-scenery";
import {
  DEFAULT_IDENTITY,
  isProjectIdentity,
  type ProjectIdentity,
} from "@/lib/constants/project-identity";
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
 * 3. **Section scenery.** The same resolved tone is handed to `SectionScenery`,
 *    a canvas layer that draws a *different animation* per section rather than
 *    a recolour of one. It takes the tone as a prop precisely so the observer
 *    below stays the single answer to "which section is the reader looking at"
 *    — including the stale-route guard, which is easy to get wrong twice.
 *
 * 4. **Project identity.** A case study publishes `data-identity` on the very
 *    elements that already carry `data-tone-anchor`, so the observer below
 *    reads it off the same `current` element in the same callback and hands it
 *    to the same canvas. Which project's room it is therefore costs nothing —
 *    no second observer, no second listener, no extra work per scroll. Anything
 *    without the attribute resolves to `base`, which is today's composition.
 *
 * The observer's `rootMargin` collapses the root down to a thin band across the
 * viewport's middle, so "current section" means "the one under the reader's
 * eyeline", not "the one that happens to be tallest".
 *
 * The glow and the scenery are switched independently from the dashboard, but
 * the observer runs either way: it is what resolves `data-tone`, which both
 * halves consume, and it is cheap. Only the rendering is conditional — turning
 * a half off must not change what the other half is told about the page.
 */

/** Only the middle 10% of the viewport counts as "here". */
const MIDDLE_BAND = "-45% 0px -45% 0px";

interface AmbientBackgroundProps {
  /** The drifting colour fields, rays and stars. */
  glow?: boolean;
  /** The per-section canvas. */
  scenery?: boolean;
}

export function AmbientBackground({ glow = true, scenery = true }: AmbientBackgroundProps) {
  const pathname = usePathname();
  const [resolved, setResolved] = useState<{
    path: string;
    tone: SectionTone;
    identity: ProjectIdentity;
  } | null>(null);

  /*
   * The observed tone is stored with the route it came from and compared during
   * render rather than reset from the effect. A navigation replaces every
   * anchor on the page, and the stale route's colour would otherwise sit on the
   * backdrop until the new observer had something to report — or forever, on a
   * route with no toned sections at all.
   *
   * The identity is stored in the same object and guarded by the same
   * comparison, so leaving a project cannot leave its scene behind either.
   */
  const fresh = resolved?.path === pathname ? resolved : null;
  const tone = fresh?.tone ?? DEFAULT_TONE;
  const identity = fresh?.identity ?? DEFAULT_IDENTITY;

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
          // Read from the same element in the same pass. A section that does not
          // belong to a project simply has no `data-identity`, and `base` is the
          // composition the site had before identities existed.
          const next = current.dataset.identity;
          setResolved({
            path: pathname,
            tone: current.dataset.tone,
            identity: isProjectIdentity(next) ? next : DEFAULT_IDENTITY,
          });
        }
      },
      { rootMargin: MIDDLE_BAND, threshold: 0 },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <div aria-hidden="true" className="ambient" data-tone={tone}>
      {/* First child, so the CSS layers below stay on top of the canvas and the
          scenery reads as depth behind them rather than a pane over them. */}
      {scenery ? <SectionScenery tone={tone} identity={identity} /> : null}
      {glow ? (
        <>
          <div className="ambient-blob ambient-blob-a" />
          <div className="ambient-blob ambient-blob-b" />
          <div className="ambient-blob ambient-blob-c" />
          <div className="ambient-rays" />
          <div className="ambient-stars" />
        </>
      ) : null}
    </div>
  );
}
