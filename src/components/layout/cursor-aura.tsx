"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionValueEvent } from "motion/react";

import { SCROLL_SUSPEND_VELOCITY, useScrollVelocity } from "@/lib/experience/use-scroll-velocity";
import { useFinePointer } from "@/lib/hooks/use-media-query";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

/** Elements the aura treats as "interactive" and grows a little for. */
const INTERACTIVE_SELECTOR = 'a, button, input, textarea, select, [role="button"], [data-cursor-label]';

/** Concurrent click ripples on screen at once. */
const MAX_RIPPLES = 3;

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface CursorAuraProps {
  /** Ids currently switched on at `/admin/settings` — see `scene-root.tsx`. */
  enabledAnimations: readonly string[];
}

/**
 * Replaces the old dot-and-ring follower (Act II) with a single composited
 * glow that tracks the pointer. The system cursor stays visible at all times
 * — this is set-dressing, not a replacement.
 *
 * The whole point is the scroll trace (§14.3 of the scenery plan): this
 * component must cost nothing while scrolling. That rules out springs
 * (they keep integrating) and rules out React state for position (it
 * re-renders). Position is written straight to `style.transform` from a
 * pointermove-batched rAF loop that parks itself the instant the pointer
 * stops moving, and the loop is cut outright — not just slowed — above
 * `SCROLL_SUSPEND_VELOCITY`.
 */
export function CursorAura({ enabledAnimations }: CursorAuraProps) {
  const finePointer = useFinePointer();
  const reducedMotion = useMotionPreference();
  const active = finePointer && !reducedMotion && enabledAnimations.includes("three-cursor");

  const auraRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef(false);
  const pointRef = useRef({ x: 0, y: 0 });
  const suspendedRef = useRef(false);
  const rippleIdRef = useRef(0);

  const [visible, setVisible] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  // A MotionValue, not React state — reading it in the effect below never
  // re-renders this component. §10's shared gate: card tilt (S14.3) and the
  // raycaster (§6.2) suspend on the same threshold.
  const scrollVelocity = useScrollVelocity();
  useMotionValueEvent(scrollVelocity, "change", (velocity) => {
    const next = velocity > SCROLL_SUSPEND_VELOCITY;
    if (next === suspendedRef.current) return;
    suspendedRef.current = next;
    setSuspended(next);
    if (next && rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  });

  useEffect(() => {
    if (!active) return;

    function tick() {
      rafRef.current = null;
      if (suspendedRef.current || !pendingRef.current) return;
      pendingRef.current = false;
      const el = auraRef.current;
      if (el) {
        el.style.transform = `translate3d(${pointRef.current.x}px, ${pointRef.current.y}px, 0)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    function onMove(event: PointerEvent) {
      if (event.pointerType === "touch") return;
      pointRef.current = { x: event.clientX, y: event.clientY };
      pendingRef.current = true;
      setVisible(true);
      if (rafRef.current == null && !suspendedRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    // Delegated rather than per-element: state only changes on the target
    // actually changing, not on every pixel the pointer crosses.
    function onOver(event: PointerEvent) {
      const target = (event.target as Element | null)?.closest(INTERACTIVE_SELECTOR);
      if (!target) return;
      setHovering(true);
      setHoverLabel(target.getAttribute("data-cursor-label"));
    }

    function onOut(event: PointerEvent) {
      const target = (event.target as Element | null)?.closest(INTERACTIVE_SELECTOR);
      if (!target) return;
      const related = event.relatedTarget as Element | null;
      if (related?.closest(INTERACTIVE_SELECTOR) === target) return;
      setHovering(false);
      setHoverLabel(null);
    }

    function onLeaveWindow() {
      setVisible(false);
    }

    function onDown(event: PointerEvent) {
      if (event.pointerType === "touch") return;
      const id = rippleIdRef.current++;
      setRipples((current) => [...current.slice(-(MAX_RIPPLES - 1)), { id, x: event.clientX, y: event.clientY }]);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("pointerleave", onLeaveWindow);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("pointerleave", onLeaveWindow);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div aria-hidden="true" className="cursor-aura-layer">
      <div ref={auraRef} className="cursor-aura" data-visible={visible} data-suspended={suspended}>
        <div className={cn("cursor-aura-glow", hovering && "cursor-aura-glow--hover")}>
          {hoverLabel ? <span className="label-mono cursor-aura-label">{hoverLabel}</span> : null}
        </div>
      </div>
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="cursor-aura-ripple"
          style={{ left: ripple.x, top: ripple.y }}
          onAnimationEnd={() => setRipples((current) => current.filter((r) => r.id !== ripple.id))}
        />
      ))}
    </div>
  );
}
