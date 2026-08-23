"use client";

import { ReactLenis, useLenis } from "lenis/react";
import Snap from "lenis/snap";
import { useEffect, type ReactNode } from "react";

import { TASKBAR_HEIGHT_PX } from "@/components/desktop/desktop-config";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

import { registerLenis } from "./lenis-registry";

/**
 * Lenis owns the page scroll.
 *
 * Two things had to be reconciled here. The desktop shell pages one section per
 * screen using CSS `scroll-snap-type`, and Lenis animates `scrollTop` itself —
 * native snapping fights that, yanking the position mid-tween. So CSS snapping
 * is retired (see `use-section-paging.ts`, which now only fixes scroll padding)
 * and `lenis/snap` takes over with the same `proximity` behaviour and the same
 * breakpoint rules. The metaphor is unchanged; only the engine moved.
 *
 * Lenis is skipped entirely under reduced motion rather than configured to be
 * fast. Smoothing *is* the effect, and a visitor who turns motion off should
 * get the browser's own scrolling, including its accessibility behaviours.
 */

const PAGING_QUERY = "(min-width: 768px) and (min-height: 640px)";

export function SmoothScroll({ children }: { children: ReactNode }) {
  const reducedMotion = useMotionPreference();

  if (reducedMotion) return <>{children}</>;

  return (
    // `root` puts Lenis on <html> rather than a wrapper element, which keeps
    // `position: fixed` chrome (taskbar, cursor, HUD) anchored to the viewport.
    <ReactLenis
      root
      options={{
        // Just over Lenis's 0.1 default. The previous 0.085 read as lag rather
        // than weight: a notch of the wheel took most of a second to settle,
        // and every scroll-driven effect on the page — veils, rails, the
        // tunnel dolly — inherited that delay, so the whole site felt behind
        // the pointer. This still glides; it just arrives.
        lerp: 0.12,
        // 1:1 with the wheel. Damping the input as well as the output made a
        // full flick cover less ground than a native scroll would.
        wheelMultiplier: 1,
        // Touch is left native. Syncing it costs the platform's own overscroll
        // and momentum, which readers on a phone notice immediately.
        syncTouch: false,
      }}
    >
      <PaneSnapping />
      {children}
    </ReactLenis>
  );
}

/**
 * Proximity snapping across the `[data-pane]` wrappers.
 *
 * Rendered as a child of `ReactLenis` because it needs the instance from
 * context — the provider cannot consume its own context in the same component.
 * Nothing is drawn; this is behaviour with a mount point.
 */
function PaneSnapping() {
  const lenis = useLenis();

  // Published so `scrollToSection` — a plain function in a click handler — can
  // route dock navigation through the same scroller the wheel uses.
  useEffect(() => {
    registerLenis(lenis ?? null);
    return () => registerLenis(null);
  }, [lenis]);

  useEffect(() => {
    if (!lenis) return;

    const paging = window.matchMedia(PAGING_QUERY);
    let snap: Snap | null = null;

    function attach() {
      // Below the breakpoint a snap point every screen turns an ordinary flick
      // into a fight, so the pages are simply a long scroll there.
      if (!paging.matches || !lenis) {
        snap?.destroy();
        snap = null;
        return;
      }
      if (snap) return;

      snap = new Snap(lenis, {
        // `proximity`, never `mandatory`: Projects and Experience can outgrow
        // the viewport and a reader must be able to stop inside one.
        type: "proximity",
        // Snapping fires once the wheel has gone quiet, so it should only
        // finish a movement the reader already made. At 20% it reached out for
        // positions they had deliberately stopped at, which is the one way a
        // proximity snap can still feel like being grabbed.
        distanceThreshold: "12%",
        duration: 0.7,
      });

      snap.addElements(Array.from(document.querySelectorAll<HTMLElement>("[data-pane]")), {
        align: "start",
      });
    }

    attach();
    paging.addEventListener("change", attach);

    return () => {
      paging.removeEventListener("change", attach);
      snap?.destroy();
    };
  }, [lenis]);

  // The taskbar is fixed over the first strip of every pane; Lenis reads this
  // padding when it resolves an anchor target, so a jump lands clear of it.
  // It hides on the way down, but an anchor jump is a scroll *up* as often as
  // not, and landing under a bar that is about to reappear is the worse miss.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.scrollPaddingTop;
    root.style.scrollPaddingTop = `${TASKBAR_HEIGHT_PX}px`;
    return () => {
      root.style.scrollPaddingTop = previous;
    };
  }, []);

  return null;
}
