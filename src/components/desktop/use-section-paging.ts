"use client";

import { useEffect } from "react";

import { getLenis } from "@/components/experience/scroll/lenis-registry";

import { TASKBAR_HEIGHT_PX } from "./desktop-config";

/**
 * Scroll offsets for the desktop shell.
 *
 * This hook used to own the paging too, via CSS `scroll-snap-type` on <html>.
 * It no longer does: Lenis animates `scrollTop` itself and native snapping
 * yanks the position mid-tween, so snapping moved to `lenis/snap` inside
 * `smooth-scroll.tsx`, which reproduces the same `proximity` behaviour and the
 * same breakpoint rules. What is left here is the offset fix-up, which is not
 * Lenis's business.
 *
 * The styles go on <html> as inline properties rather than a class, and the
 * previous values are restored on unmount, so nothing leaks into `/admin` or
 * `/play` — which render outside this shell and never mount the hook.
 */

export function useSectionPaging() {
  useEffect(() => {
    const root = document.documentElement;

    const previous = {
      scrollPaddingTop: root.style.scrollPaddingTop,
      scrollPaddingBottom: root.style.scrollPaddingBottom,
    };

    // `globals.css` reserves 6rem at the top for a header that is 56px tall,
    // so the reservation is trimmed to the bar's actual height rather than
    // removed: an anchor jump has to clear the taskbar, and only the taskbar.
    root.style.scrollPaddingTop = `${TASKBAR_HEIGHT_PX}px`;
    root.style.scrollPaddingBottom = "0px";

    return () => {
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
  const lenis = getLenis();

  // Lenis is absent under reduced motion and on routes outside the site shell;
  // the native path is the correct fallback rather than a degraded one.
  if (lenis) {
    lenis.scrollTo(target as HTMLElement, { offset: 0, duration: 1.1 });
    return true;
  }

  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  return true;
}
