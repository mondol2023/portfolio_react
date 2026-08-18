"use client";

import { motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

import { EASE_OUT } from "./variants";

/**
 * Bomb intro — plays once, the first time a section scrolls into view.
 *
 * A black cartoon bomb is thrown in from a random side and blasts into
 * colourful sand + smoke, always centred on the screen (not the section —
 * `fixed`, so it lands mid-viewport no matter where the section sits or how
 * tall it is). Once the blast clears, `children` fade/rise in as normal —
 * nothing about their own animations (Reveal, Stagger, ...) is touched, they
 * just start a beat later.
 */

const SIDES = ["top", "right", "bottom", "left"] as const;
type Side = (typeof SIDES)[number];

/** Off-screen throw origin, per side — relative to the fixed, screen-centred overlay. */
const START: Record<Side, { x: number; y: number }> = {
  top: { x: 0, y: -600 },
  right: { x: 600, y: 0 },
  bottom: { x: 0, y: 600 },
  left: { x: -600, y: 0 },
};

/** Approximation of a classic 8-point cartoon spark, as a clip-path polygon. */
const SPARK_CLIP =
  "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";

const SAND_COLORS = ["#fbbf24", "#f472b6", "#38bdf8", "#a78bfa", "#4ade80", "#fb7185"];
const PARTICLE_COUNT = 16;

interface Particle {
  x: number;
  y: number;
  color: string;
  size: number;
}

/** Particle flight paths, spread evenly around the blast with a little jitter. */
function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.4;
    const distance = 220 + Math.random() * 260;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      color: SAND_COLORS[i % SAND_COLORS.length] ?? "#fbbf24",
      size: 6 + Math.random() * 9,
    };
  });
}

type Phase = "idle" | "throw" | "blast" | "done";

export function BombIntro({ children, className }: { children: ReactNode; className?: string }) {
  const hydrated = useHydrated();
  const reducedMotion = useMotionPreference();
  const [phase, setPhase] = useState<Phase>("idle");

  // Randomised once per mount, not per render.
  const [side] = useState<Side>(() => SIDES[Math.floor(Math.random() * SIDES.length)] ?? "top");
  const [throwMs] = useState(() => 900 + Math.random() * 400); // 0.9s–1.3s flight
  const [blastMs] = useState(() => 700 + Math.random() * 300); // 0.7s–1s blast
  const [particles] = useState(makeParticles);

  const skip = !hydrated || reducedMotion;

  // Fires once, the first time the section enters the viewport.
  function handleViewportEnter() {
    if (!skip) setPhase((p) => (p === "idle" ? "throw" : p));
  }

  useEffect(() => {
    if (phase === "throw") {
      const t = setTimeout(() => setPhase("blast"), throwMs);
      return () => clearTimeout(t);
    }
    if (phase === "blast") {
      const t = setTimeout(() => setPhase("done"), blastMs);
      return () => clearTimeout(t);
    }
  }, [phase, throwMs, blastMs]);

  const exploding = !skip && (phase === "throw" || phase === "blast");
  const contentVisible = skip || phase === "idle" || phase === "done";

  return (
    <motion.div
      className={cn("relative", className)}
      viewport={{ once: true, amount: 0.2 }}
      onViewportEnter={handleViewportEnter}
    >
      {exploding ? (
        // Fixed, not absolute: the blast centres on the viewport, not the
        // (possibly tall, possibly scrolled-past) section behind it.
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
        >
          {phase === "throw" ? (
            <motion.div
              className="relative"
              style={{ width: 96, height: 96 }}
              initial={{ x: START[side].x, y: START[side].y, opacity: 1, rotate: 0 }}
              animate={{ x: 0, y: 0, rotate: 320 }}
              transition={{ duration: throwMs / 1000, ease: "easeIn" }}
            >
              {/* fuse */}
              <div
                className="absolute rounded-full bg-amber-700"
                style={{ width: 10, height: 30, left: 48, top: -20, rotate: "15deg" }}
              />
              {/* spark */}
              <motion.div
                className="absolute bg-yellow-400"
                style={{ width: 30, height: 30, left: 52, top: -44, clipPath: SPARK_CLIP }}
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 0.2, repeat: Infinity }}
              />
              {/* body — round, black, shiny */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "radial-gradient(circle at 32% 28%, #4b5563, #0a0a0a 65%)",
                  boxShadow: "0 0 32px 6px rgba(0,0,0,0.5)",
                }}
              />
              {/* two highlight dots, as on the classic cartoon bomb */}
              <div
                className="absolute rounded-full bg-white/90"
                style={{ width: 19, height: 19, left: 24, top: 26 }}
              />
              <div
                className="absolute rounded-full bg-white/60"
                style={{ width: 10, height: 10, left: 21, top: 50 }}
              />
            </motion.div>
          ) : null}

          {phase === "blast" ? (
            <>
              {/* shockwave ring, coloured by the section's own tone */}
              <motion.div
                className="rounded-full border-4"
                style={{ borderColor: "var(--tone)", width: 40, height: 40 }}
                initial={{ scale: 0.5, opacity: 0.8 }}
                animate={{ scale: 20, opacity: 0 }}
                transition={{ duration: (blastMs * 0.9) / 1000, ease: EASE_OUT }}
              />
              {/* smoke puffs */}
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full bg-fg/30 blur-md"
                  style={{ width: 90, height: 90 }}
                  initial={{ scale: 0.3, opacity: 0.5, x: (i - 1) * 40, y: 0 }}
                  animate={{ scale: 4.5, opacity: 0, y: -60 }}
                  transition={{
                    duration: blastMs / 1000,
                    delay: i * 0.05,
                    ease: EASE_OUT,
                  }}
                />
              ))}
              {/* glittering sand — a bright core plus a twinkle as it flies out */}
              {particles.map((p, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: p.size,
                    height: p.size,
                    background: `radial-gradient(circle at 35% 30%, #fff, ${p.color})`,
                    boxShadow: `0 0 6px 1px ${p.color}`,
                  }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
                  animate={{
                    x: p.x,
                    y: p.y,
                    opacity: [1, 0.5, 1, 0],
                    scale: [0.6, 1.3, 0.8, 0.2],
                  }}
                  transition={{ duration: (blastMs * 0.95) / 1000, ease: EASE_OUT }}
                />
              ))}
            </>
          ) : null}
        </div>
      ) : null}

      <motion.div
        initial={false}
        animate={contentVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 0 }}
        transition={{ duration: contentVisible ? 0.5 : 0.12, ease: EASE_OUT }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
