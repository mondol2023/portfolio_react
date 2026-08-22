"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState } from "react";

import { SPRING } from "@/lib/experience/springs";
import { useFinePointer } from "@/lib/hooks/use-media-query";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

import {
  CURSOR_SHAPES,
  CURSOR_TARGET_SELECTOR,
  modeForElement,
  type CursorMode,
} from "./cursor-modes";

/**
 * The pointer, rebuilt.
 *
 * A dot pinned tight to the real cursor and a ring that trails a beat behind it,
 * both driven by springs rather than by frame-by-frame lerping, so the lag has
 * weight instead of just latency.
 *
 * Two decisions are worth stating, because they are what keep this cheap:
 *
 * 1. Position never enters React state. Pointer events write to motion values,
 *    motion writes to the DOM. The component re-renders only when the *mode*
 *    changes — a handful of times per session, not per frame.
 * 2. Hover states are found by delegation from `document`, not by props. Any
 *    element anywhere opts in with `data-cursor="project"`, and native
 *    interactive elements are recognised without being annotated at all. No
 *    context, no prop drilling, nothing to wire up per section.
 *
 * It renders only for a mouse or trackpad, and stands down entirely under
 * `prefers-reduced-motion` — a ring that chases the pointer is exactly the kind
 * of unrequested movement that preference is asking us to stop.
 */
export function CustomCursor() {
  const reducedMotion = useMotionPreference();
  const finePointer = useFinePointer();
  const enabled = finePointer && !reducedMotion;

  if (!enabled) return null;
  return <CursorLayer />;
}

function CursorLayer() {
  const [mode, setMode] = useState<CursorMode>("default");
  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(false);

  // Raw pointer position drives the dot; the magnet-adjusted position drives
  // the ring, which is what lets the ring drift toward a button's centre while
  // the dot stays honest about where the pointer really is.
  const dotX = useMotionValue(0);
  const dotY = useMotionValue(0);
  const ringTargetX = useMotionValue(0);
  const ringTargetY = useMotionValue(0);

  const smoothDotX = useSpring(dotX, SPRING.cursor);
  const smoothDotY = useSpring(dotY, SPRING.cursor);
  const ringX = useSpring(ringTargetX, SPRING.trail);
  const ringY = useSpring(ringTargetY, SPRING.trail);

  useEffect(() => {
    // Held across events so pointermove can keep applying the pull without
    // re-querying the DOM on every frame.
    let magnet: { rect: DOMRect; strength: number } | null = null;
    // Local mirror of `visible`, so the hot path can skip the state call
    // entirely after the first move instead of dispatching a no-op each frame.
    let shown = false;

    function resolveTarget(target: EventTarget | null): HTMLElement | null {
      if (!(target instanceof Element)) return null;
      return target.closest<HTMLElement>(CURSOR_TARGET_SELECTOR);
    }

    function handleMove(event: PointerEvent) {
      dotX.set(event.clientX);
      dotY.set(event.clientY);

      if (magnet && magnet.strength > 0) {
        const centreX = magnet.rect.left + magnet.rect.width / 2;
        const centreY = magnet.rect.top + magnet.rect.height / 2;
        ringTargetX.set(event.clientX + (centreX - event.clientX) * magnet.strength);
        ringTargetY.set(event.clientY + (centreY - event.clientY) * magnet.strength);
      } else {
        ringTargetX.set(event.clientX);
        ringTargetY.set(event.clientY);
      }

      if (!shown) {
        shown = true;
        setVisible(true);
      }
    }

    function handleOver(event: PointerEvent) {
      const element = resolveTarget(event.target);
      const next = element ? modeForElement(element) : "default";

      // Only elements that ask for it get pulled on. A magnetic ring over a
      // paragraph link would drag the cursor off the words being read.
      magnet =
        element && element.dataset.magnetic !== undefined
          ? { rect: element.getBoundingClientRect(), strength: CURSOR_SHAPES[next].magnetism }
          : null;

      setMode(next);
    }

    function handleOut(event: PointerEvent) {
      // `relatedTarget` is where the pointer went. If that is still inside a
      // target, we are only crossing between one element's own children.
      if (resolveTarget(event.relatedTarget)) return;
      magnet = null;
      setMode("default");
    }

    function handleDown() {
      setPressed(true);
    }

    function handleUp() {
      setPressed(false);
    }

    function handleLeave() {
      shown = false;
      setVisible(false);
    }

    // A scroll slides the page under a stationary pointer, so a cached rect is
    // stale the moment the page moves.
    function clearMagnet() {
      magnet = null;
    }

    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("pointerdown", handleDown, { passive: true });
    window.addEventListener("pointerup", handleUp, { passive: true });
    window.addEventListener("scroll", clearMagnet, { passive: true });
    document.addEventListener("pointerover", handleOver, { passive: true });
    document.addEventListener("pointerout", handleOut, { passive: true });
    document.addEventListener("pointerleave", handleLeave, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerdown", handleDown);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("scroll", clearMagnet);
      document.removeEventListener("pointerover", handleOver);
      document.removeEventListener("pointerout", handleOut);
      document.removeEventListener("pointerleave", handleLeave);
    };
  }, [dotX, dotY, ringTargetX, ringTargetY]);

  // Hides the system cursor only while ours is mounted, so a failed hydration
  // or a torn-down route never leaves the visitor without a pointer.
  useEffect(() => {
    document.documentElement.dataset.customCursor = "on";
    return () => {
      delete document.documentElement.dataset.customCursor;
    };
  }, []);

  const shape = CURSOR_SHAPES[mode];
  const opacity = visible ? (mode === "disabled" ? 0.4 : 1) : 0;

  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[95] mix-blend-difference"
        style={{ x: ringX, y: ringY }}
      >
        <motion.div
          className="flex items-center justify-center rounded-full border border-white/70 font-mono text-[9px] uppercase tracking-[0.2em] text-white"
          style={{ translate: "-50% -50%" }}
          animate={{
            width: shape.ring,
            height: shape.ring,
            borderWidth: shape.border,
            backgroundColor: `rgba(255,255,255,${shape.fill})`,
            scale: pressed ? 0.82 : 1,
            opacity,
          }}
          transition={{ type: "spring", ...SPRING.snappy }}
        >
          {shape.label ?? null}
        </motion.div>
      </motion.div>

      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[96] mix-blend-difference"
        style={{ x: smoothDotX, y: smoothDotY }}
      >
        <motion.div
          className="rounded-full bg-white"
          style={{ translate: "-50% -50%" }}
          animate={{ width: shape.dot, height: shape.dot, opacity }}
          transition={{ type: "spring", ...SPRING.snappy }}
        />
      </motion.div>
    </>
  );
}
