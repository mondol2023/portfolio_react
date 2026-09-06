"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { COLLECT_FEEL } from "../config/game-config";
import { subscribeCollectFlyoff, type CollectFlyoffOrigin } from "../interactions/collect-flyoff-bus";
import { useMotionPreference } from "../hooks/use-motion-preference";

interface Ghost {
  id: number;
  from: CollectFlyoffOrigin;
  to: CollectFlyoffOrigin;
}

/**
 * The collect payoff's HTML half: a small glowing dot that flies from the
 * collected shape's last screen position to the HUD score chip, then fades.
 * The in-world half (the particle burst) is already enqueued by
 * `GestureController`; this is purely presentational, Motion-driven per the
 * module's HTML-overlay convention.
 *
 * Under reduced motion this renders nothing — the particle burst and the
 * score chip's own number change already carry the feedback without adding
 * a moving element across the viewport.
 */
export function CollectFlyoff() {
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const nextId = useRef(0);
  const reducedMotion = useMotionPreference();

  useEffect(() => {
    if (reducedMotion) return;

    return subscribeCollectFlyoff((origin) => {
      const target = document.querySelector<HTMLElement>("[data-collect-target]");
      const rect = target?.getBoundingClientRect();
      const to = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : origin;

      const ghost: Ghost = { id: nextId.current++, from: origin, to };
      setGhosts((current) => [...current.slice(-3), ghost]);
      setTimeout(() => {
        setGhosts((current) => current.filter((candidate) => candidate.id !== ghost.id));
      }, COLLECT_FEEL.flyoffDurationMs + 100);
    });
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30" aria-hidden="true">
      <AnimatePresence>
        {ghosts.map((ghost) => (
          <motion.span
            key={ghost.id}
            initial={{ opacity: 1, scale: 1, left: ghost.from.x, top: ghost.from.y }}
            animate={{ opacity: 0.1, scale: 0.4, left: ghost.to.x, top: ghost.to.y }}
            exit={{ opacity: 0 }}
            transition={{ duration: COLLECT_FEEL.flyoffDurationMs / 1000, ease: "easeIn" }}
            className="fixed h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
