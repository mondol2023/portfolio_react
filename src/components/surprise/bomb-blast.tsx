"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { EASE_OUT } from "@/components/motion/variants";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * A bomb, lobbed in from somewhere off-screen, detonating dead centre.
 *
 * Mount it and it plays; there is no `play` prop and no imperative handle. To
 * fire it again, mount it again with a new `key` — which is also what
 * re-randomises the shell colour, the throw origin and the flight time, so no
 * two blasts look alike.
 *
 * It reports two moments rather than one:
 *
 * - `onBlast` — the fuse has run out and the wash is on its way up. This is the
 *   last moment at which anything underneath can start getting out of sight
 *   before the smoke is thick enough to hide it, so it fires at detonation
 *   rather than at the peak: what the caller does with the cover it is being
 *   handed is the caller's business, and `BLAST_MS` below says how long it has.
 * - `onDone` — the last of it has gone and the overlay is safe to unmount.
 *
 * Nothing here touches the page: it is one `fixed`, `pointer-events: none`
 * overlay that paints and then stops existing.
 */

/* --------------------------------------------------------------- timing -- */

const FLY_MIN_MS = 720;
const FLY_JITTER_MS = 280;

/**
 * From `onBlast` until the last puff has faded.
 *
 * Exported because it is the length of the cover: a caller hiding something
 * behind the smoke needs to know when the smoke stops being there.
 */
export const BLAST_MS = 1700;

/** Reduced motion gets the two callbacks and none of the theatre. */
const STILL_BLAST_MS = 60;
const STILL_DONE_MS = 220;

/* ---------------------------------------------------------------- shell -- */

interface Shell {
  /** Lit side of the casing. */
  core: string;
  /** Shadow side, and the bulk of the colour. */
  deep: string;
  /** Fuse spark, shockwave and the brightest debris. */
  spark: string;
}

const SHELLS = [
  { core: "#9ca3af", deep: "#0b0d12", spark: "#fcd34d" },
  { core: "#fda4af", deep: "#5b0a1f", spark: "#fde68a" },
  { core: "#7dd3fc", deep: "#0c2b46", spark: "#e0f2fe" },
  { core: "#c4b5fd", deep: "#2e1065", spark: "#f5d0fe" },
  { core: "#86efac", deep: "#052e1a", spark: "#fef08a" },
  { core: "#fdba74", deep: "#5a1c05", spark: "#fff7ed" },
  { core: "#f0abfc", deep: "#4a044e", spark: "#fae8ff" },
  { core: "#67e8f9", deep: "#083344", spark: "#ecfeff" },
] as const;

/** Approximation of a classic 8-point cartoon spark, as a clip-path polygon. */
const SPARK_CLIP =
  "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";

/* ------------------------------------------------------------- geometry -- */

/**
 * Somewhere off-screen, in any direction.
 *
 * The radius is scaled off the viewport rather than fixed, so the bomb starts
 * outside the glass on a phone and on an ultrawide alike.
 */
function throwOrigin(): { x: number; y: number } {
  const angle = Math.random() * Math.PI * 2;
  const width = typeof window === "undefined" ? 1280 : window.innerWidth;
  const height = typeof window === "undefined" ? 800 : window.innerHeight;

  return {
    x: Math.cos(angle) * (width * 0.62 + 180),
    y: Math.sin(angle) * (height * 0.62 + 180),
  };
}

interface Fragment {
  x: number;
  y: number;
  size: number;
  color: string;
  round: boolean;
}

/**
 * Debris, spread evenly around the blast with enough jitter that the ring does
 * not read as a ring. The vertical throw is squashed and biased downward — a
 * perfect circle of debris looks like a diagram, a flattened one looks thrown.
 */
function makeFragments(shell: Shell): Fragment[] {
  const palette = [shell.core, shell.spark, "#ffffff", shell.core, shell.spark];

  return Array.from({ length: 28 }, (_, i) => {
    const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.55;
    const distance = 190 + Math.random() * 430;

    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance * 0.78 + 70,
      size: 5 + Math.random() * 11,
      color: palette[i % palette.length] ?? shell.spark,
      round: Math.random() < 0.6,
    };
  });
}

interface Puff {
  x: number;
  y: number;
  size: number;
  scale: number;
  drift: number;
  delay: number;
}

/** Smoke: slower, larger and more overlapping than the debris, and it rises. */
function makePuffs(): Puff[] {
  return Array.from({ length: 9 }, (_, i) => ({
    x: (i - 4) * 46 + (Math.random() - 0.5) * 60,
    y: (Math.random() - 0.5) * 70,
    size: 110 + Math.random() * 90,
    scale: 3.4 + Math.random() * 2.2,
    drift: -90 - Math.random() * 120,
    delay: Math.random() * 0.18,
  }));
}

/* ------------------------------------------------------------ component -- */

type Phase = "fly" | "blast";

interface BombBlastProps {
  /** It has gone off and the wash is coming up — take cover now. */
  onBlast?: () => void;
  /** Nothing is left on screen; unmount this. */
  onDone?: () => void;
}

export function BombBlast({ onBlast, onDone }: BombBlastProps) {
  const still = useMotionPreference();
  const [phase, setPhase] = useState<Phase>("fly");

  // Rolled once per mount, never per render — the parent re-keys to replay.
  const [shell] = useState<Shell>(() => SHELLS[Math.floor(Math.random() * SHELLS.length)] ?? SHELLS[0]);
  const [origin] = useState(throwOrigin);
  const [flyMs] = useState(() => FLY_MIN_MS + Math.random() * FLY_JITTER_MS);
  const [spin] = useState(() => (Math.random() < 0.5 ? -1 : 1) * (280 + Math.random() * 340));
  const [fragments] = useState(() => makeFragments(shell));
  const [puffs] = useState(makePuffs);

  /*
   * The callbacks are held in a ref rather than listed as dependencies. They
   * are the parent's render-scope closures, so a parent that re-renders
   * mid-flight would otherwise re-run the effect and restart every timer — the
   * bomb would hang in the air for as long as the parent kept re-rendering.
   */
  const report = useRef({ onBlast, onDone });

  // No dependency list: after every commit, so the timers below always call the
  // parent's current closures without ever listing them as dependencies.
  useEffect(() => {
    report.current = { onBlast, onDone };
  });

  useEffect(() => {
    if (still) {
      const timers = [
        setTimeout(() => report.current.onBlast?.(), STILL_BLAST_MS),
        setTimeout(() => report.current.onDone?.(), STILL_DONE_MS),
      ];
      return () => timers.forEach(clearTimeout);
    }

    const timers = [
      // Detonation and the report are the same instant, in that order: the
      // caller's first frame of cover is this component's first frame of smoke.
      setTimeout(() => {
        setPhase("blast");
        report.current.onBlast?.();
      }, flyMs),
      setTimeout(() => report.current.onDone?.(), flyMs + BLAST_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, [flyMs, still]);

  if (still) return null;

  const flySeconds = flyMs / 1000;
  // The bomb arcs *over* the centre before dropping onto it, rather than
  // sliding in on a straight line. Height scales with how far it has to come.
  const peak = -(Math.abs(origin.y) * 0.22 + 200);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
    >
      {phase === "fly" ? (
        <motion.div
          className="relative"
          style={{ width: 104, height: 104 }}
          initial={{ x: origin.x, y: origin.y, rotate: 0, scale: 0.75 }}
          animate={{ x: 0, y: [origin.y, peak, 0], rotate: spin, scale: 1 }}
          transition={{
            duration: flySeconds,
            x: { ease: "linear" },
            rotate: { ease: "linear" },
            scale: { ease: "linear" },
            // Two segments with opposite easings: decelerating on the way up,
            // accelerating on the way down. That is what makes it read as
            // thrown rather than flown.
            y: { times: [0, 0.58, 1], ease: ["easeOut", "easeIn"] },
          }}
        >
          {/* fuse */}
          <div
            className="absolute rounded-full"
            style={{ width: 10, height: 32, left: 52, top: -22, rotate: "16deg", background: "#92400e" }}
          />
          {/* spark, guttering as it burns down */}
          <motion.div
            className="absolute"
            style={{ width: 32, height: 32, left: 56, top: -48, clipPath: SPARK_CLIP, background: shell.spark }}
            animate={{ scale: [1, 1.35, 0.9], opacity: [1, 0.65, 1] }}
            transition={{ duration: 0.22, repeat: Infinity }}
          />
          {/* casing */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle at 32% 28%, ${shell.core}, ${shell.deep} 66%)`,
              boxShadow: `0 0 40px 8px ${shell.deep}80`,
            }}
          />
          {/* the two highlight dots of the classic cartoon bomb */}
          <div className="absolute rounded-full bg-white/90" style={{ width: 20, height: 20, left: 26, top: 28 }} />
          <div className="absolute rounded-full bg-white/55" style={{ width: 11, height: 11, left: 23, top: 54 }} />
        </motion.div>
      ) : null}

      {phase === "blast" ? (
        <>
          {/*
           * The wash. This is the one piece doing real work for the caller: it
           * puts a near-opaque sheet of smoke over the viewport by the quarter
           * mark and holds it there, which is the window anything underneath
           * has to change out of sight.
           */}
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(150,152,160,0.96) 0%, rgba(122,124,133,0.8) 38%, rgba(100,102,110,0) 74%)",
            }}
            initial={{ opacity: 0, scale: 0.55 }}
            animate={{ opacity: [0, 0.92, 0.86, 0], scale: [0.55, 1.5, 1.75, 2.1] }}
            transition={{ duration: BLAST_MS / 1000, times: [0, 0.25, 0.42, 1], ease: "easeOut" }}
          />

          {/* muzzle flash */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 200,
              height: 200,
              background: `radial-gradient(circle, #fff 0%, ${shell.spark} 42%, transparent 70%)`,
            }}
            initial={{ scale: 0.25, opacity: 1 }}
            animate={{ scale: 4.2, opacity: 0 }}
            transition={{ duration: 0.38, ease: EASE_OUT }}
          />

          {/* two shockwave rings, the second a beat behind */}
          {[0, 0.12].map((delay) => (
            <motion.div
              key={delay}
              className="absolute rounded-full border-4"
              style={{ width: 48, height: 48, borderColor: shell.spark }}
              initial={{ scale: 0.4, opacity: 0.85 }}
              animate={{ scale: 26, opacity: 0 }}
              transition={{ duration: 1, delay, ease: EASE_OUT }}
            />
          ))}

          {puffs.map((puff, i) => (
            <motion.div
              key={`puff-${i}`}
              className="absolute rounded-full blur-2xl"
              style={{
                width: puff.size,
                height: puff.size,
                background: "radial-gradient(circle at 40% 35%, rgba(190,192,200,0.9), rgba(96,98,106,0.55) 70%)",
              }}
              initial={{ x: puff.x, y: puff.y, scale: 0.3, opacity: 0 }}
              animate={{ scale: puff.scale, opacity: [0, 0.7, 0], y: puff.y + puff.drift }}
              transition={{ duration: BLAST_MS / 1000, delay: puff.delay, times: [0, 0.3, 1], ease: "easeOut" }}
            />
          ))}

          {fragments.map((fragment, i) => (
            <motion.div
              key={`frag-${i}`}
              className="absolute"
              style={{
                width: fragment.size,
                height: fragment.size,
                borderRadius: fragment.round ? "9999px" : "2px",
                background: `radial-gradient(circle at 35% 30%, #fff, ${fragment.color})`,
                boxShadow: `0 0 8px 1px ${fragment.color}`,
              }}
              initial={{ x: 0, y: 0, scale: 0.5, opacity: 1, rotate: 0 }}
              animate={{
                x: fragment.x,
                y: fragment.y,
                scale: [0.5, 1.25, 0.7, 0.15],
                opacity: [1, 1, 0.6, 0],
                rotate: fragment.round ? 0 : 540,
              }}
              transition={{ duration: (BLAST_MS * 0.72) / 1000, ease: EASE_OUT }}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}
