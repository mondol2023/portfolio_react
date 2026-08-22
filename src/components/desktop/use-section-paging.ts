"use client";

import { useEffect } from "react";

import { TASKBAR_HEIGHT_PX } from "./desktop-config";

/**
 * Turns the page into screens.
 *
 * One section per viewport, scroll snapping between them — the "scrolling brings
 * the next section" half of the desktop metaphor. The wrappers that make each
 * section a full screen are in `desktop-panes.tsx`; this hook only decides when
 * the snapping is switched on, and fixes up the scroll offsets that the old
 * fixed *top* header used to need.
 *
 * Three deliberate limits:
 *
 *  - `proximity`, never `mandatory`. Projects and Experience can be taller than
 *    the viewport, and mandatory snapping fights a reader trying to stop in the
 *    middle of one.
 *  - Off below 768×640. On a phone a snap point every screen turns an ordinary
 *    flick into a fight, and the sections are taller than the viewport anyway.
 *  - Off under `prefers-reduced-motion`. Snapping is motion the visitor did not
 *    ask for; without it the page is simply a long scroll, which still works.
 *
 * The styles go on `<html>` as inline properties rather than a class, and the
 * previous values are restored on unmount, so nothing leaks into `/admin` or
 * `/play` — which render outside this shell and never mount the hook.
 */

const PAGING_QUERY = "(min-width: 768px) and (min-height: 640px)";
const STILL_QUERY = "(prefers-reduced-motion: reduce)";

export function useSectionPaging() {
  useEffect(() => {
    const root = document.documentElement;
    const paging = window.matchMedia(PAGING_QUERY);
    const still = window.matchMedia(STILL_QUERY);

    const previous = {
      scrollSnapType: root.style.scrollSnapType,
      scrollPaddingTop: root.style.scrollPaddingTop,
      scrollPaddingBottom: root.style.scrollPaddingBottom,
    };

    function apply() {
      // `globals.css` reserves 6rem at the top for a header that this shell does
      // not have. The obstruction is now at the bottom, so the reservation moves
      // with it — otherwise every anchor jump lands 96px too low and the last
      // line of a section hides behind the taskbar.
      root.style.scrollPaddingTop = "0px";
      root.style.scrollPaddingBottom = `${TASKBAR_HEIGHT_PX}px`;
      root.style.scrollSnapType = paging.matches && !still.matches ? "y proximity" : "";
    }

    apply();
    paging.addEventListener("change", apply);
    still.addEventListener("change", apply);

    return () => {
      paging.removeEventListener("change", apply);
      still.removeEventListener("change", apply);
      root.style.scrollSnapType = previous.scrollSnapType;
      root.style.scrollPaddingTop = previous.scrollPaddingTop;
      root.style.scrollPaddingBottom = previous.scrollPaddingBottom;
    };
  }, []);
}

/**
 * Scrolls to a section the way the paging does, and reports whether it could.
 *
 * A section sits *centred* inside its pane, so its own top edge is not where the
 * screen begins. Jumping to `#about` directly would frame it differently from
 * arriving at it by scrolling, and the difference is obvious when the two happen
 * back to back. Targeting the pane keeps both routes identical.
 *
 * Returns false when there is no such section on this page — on
 * `/projects/[slug]`, which wears the same chrome, the dock's links have to fall
 * through to an ordinary navigation back to the home page.
 */
export function scrollToSection(id: string): boolean {
  const section = document.getElementById(id);
  if (!section) return false;

  const target = section.closest("[data-pane]") ?? section;
  const still = window.matchMedia(STILL_QUERY).matches;

  target.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  return true;
}
