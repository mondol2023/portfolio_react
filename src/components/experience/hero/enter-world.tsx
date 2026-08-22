"use client";

import { motion, useAnimationControls } from "motion/react";
import { useRef } from "react";

import { scrollToSection } from "@/components/desktop/use-section-paging";
import { Magnetic } from "@/components/experience/magnetic";
import { SPRING } from "@/lib/experience/springs";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

import { dispatchHeroEnter } from "./hero-events";

/**
 * `[ ENTER WORLD ]` — the hero's commit action.
 *
 * Pressing it does three things in sequence rather than one: the button
 * compresses under the press, the camera dives forward into the scene, and the
 * page travels to the next section. The delay between the second and third is
 * the whole point — the dive has to read as *going somewhere* before the
 * destination arrives, or the 3D move is wasted behind a scroll.
 */

/** Long enough for the camera dive to register, short enough to feel answered. */
const DIVE_MS = 420;

export function EnterWorld({ target = "about" }: { target?: string }) {
  const reducedMotion = useMotionPreference();
  const controls = useAnimationControls();
  const travelling = useRef(false);

  async function onClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    // Double-clicking should not queue two dives.
    if (travelling.current) return;
    travelling.current = true;

    if (reducedMotion) {
      scrollToSection(target);
      travelling.current = false;
      return;
    }

    dispatchHeroEnter();

    // Compress, then release — the spring's overshoot on the way back is what
    // makes the press feel physical instead of merely acknowledged.
    void controls.start({
      scale: [1, 0.9, 1.04, 1],
      transition: { duration: 0.5, times: [0, 0.18, 0.55, 1], ease: "easeOut" },
    });

    window.setTimeout(() => {
      scrollToSection(target);
      travelling.current = false;
    }, DIVE_MS);
  }

  return (
    <Magnetic strength={0.4} tilt={8}>
      <motion.button
        type="button"
        onClick={onClick}
        animate={controls}
        whileHover={reducedMotion ? undefined : { scale: 1.03 }}
        whileTap={reducedMotion ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", ...SPRING.snappy }}
        data-cursor="button"
        className="group relative inline-flex h-13 items-center justify-center gap-3 overflow-hidden rounded-full border border-tone/60 bg-tone-soft px-8 font-mono text-sm tracking-[0.2em] text-fg uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone"
      >
        {/* A sweep of light crossing the button on hover — the surface reads as
            powered rather than merely coloured. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-tone/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        />
        <span aria-hidden="true" className="text-tone">
          [
        </span>
        Enter world
        <span aria-hidden="true" className="text-tone">
          ]
        </span>
      </motion.button>
    </Magnetic>
  );
}
