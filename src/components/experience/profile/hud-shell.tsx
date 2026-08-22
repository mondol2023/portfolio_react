"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

import { SPRING } from "@/lib/experience/springs";
import { useFinePointer } from "@/lib/hooks/use-media-query";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

/**
 * The readout the profile is drawn on: a spotlight that follows the pointer and
 * a scan line that sweeps down the panel.
 *
 * Both are painted behind the content and both are decoration, so the whole
 * overlay is `aria-hidden` and the profile below it is ordinary, readable DOM.
 *
 * The spotlight is measured against *this element*, not the window. A viewport
 * -relative gradient would drift out of the panel entirely whenever the pane
 * scrolled, and the effect reads as a torch held over the card — which only
 * works if the torch and the card share a coordinate space.
 */

export function HudShell({ children, className }: { children: ReactNode; className?: string }) {
  const reducedMotion = useMotionPreference();
  const finePointer = useFinePointer();
  const host = useRef<HTMLDivElement>(null);

  // Parked off the top-left corner so the spotlight is not sitting in the
  // middle of the card before the pointer has ever entered it.
  const rawX = useMotionValue(-20);
  const rawY = useMotionValue(-20);
  const x = useSpring(rawX, SPRING.rail);
  const y = useSpring(rawY, SPRING.rail);
  const spotlight = useMotionTemplate`radial-gradient(28rem 28rem at ${x}% ${y}%, var(--tone-soft), transparent 70%)`;

  const inert = reducedMotion || !finePointer;

  useEffect(() => {
    const element = host.current;
    if (!element || inert) return;

    function onMove(event: PointerEvent) {
      const rect = element!.getBoundingClientRect();
      rawX.set(((event.clientX - rect.left) / rect.width) * 100);
      rawY.set(((event.clientY - rect.top) / rect.height) * 100);
    }

    function onLeave() {
      rawX.set(-20);
      rawY.set(-20);
    }

    element.addEventListener("pointermove", onMove, { passive: true });
    element.addEventListener("pointerleave", onLeave);

    return () => {
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", onLeave);
    };
  }, [inert, rawX, rawY]);

  return (
    <div ref={host} className={cn("relative isolate", className)}>
      <div aria-hidden="true" className="pointer-events-none absolute -inset-6 -z-10 overflow-hidden">
        {!inert ? (
          <motion.div style={{ background: spotlight }} className="absolute inset-0" />
        ) : null}

        {/* The sweep is a CSS animation rather than a Motion loop: it never
            reads state, never stops, and running it off the compositor keeps it
            free while the 3D sections elsewhere on the page are working. */}
        {!reducedMotion ? <span className="hud-scanline" /> : null}
      </div>

      {children}
    </div>
  );
}
