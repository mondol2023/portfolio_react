"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { playCue, primeAudio, syncMasterVolume } from "../audio/audio-controller";
import { useAudioStore } from "../stores/audio-store";
import { useScoreStore } from "../stores/score-store";
import { ScorePopups } from "./score-popups";
import { useGameActive } from "./game-provider";

/**
 * The world's score chip — bottom-centre, deliberately: the host's own
 * Game HUD owns bottom-left, the toast viewport bottom-right.
 *
 * Renders nothing unless the world is active, and subscribes to exactly two
 * score fields, so score changes re-render only this chip. Sound is opt-out
 * via the speaker button; the audio controller itself starts lazily on the
 * visitor's first real gesture. The hint line doubles as the affordance for
 * the world's three gestures (drag, poke-by-tap, hold-to-collect).
 *
 * Host-styled on purpose: this is the presentation adapter — the one place
 * the module leans on the host design system (its Tailwind tokens) so the
 * world looks native inside the portfolio. The simulation below stays
 * host-free.
 */
export function GameHUD() {
  const active = useGameActive();
  const points = useScoreStore((state) => state.points);
  const multiplier = useScoreStore((state) => state.multiplier);
  const enabled = useAudioStore((state) => state.enabled);
  const toggle = useAudioStore((state) => state.toggle);
  const [hintVisible, setHintVisible] = useState(true);

  useEffect(() => {
    syncMasterVolume();
  }, [enabled]);

  useEffect(() => {
    const timer = setTimeout(() => setHintVisible(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="pointer-events-auto fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center"
    >
      <ScorePopups />

      <div
        className="flex items-center gap-3 rounded-full border border-border bg-surface/90 px-4 py-2 text-xs shadow-floating backdrop-blur-xl"
        data-game-ignore
        // The collect fly-off ghost's landing target — `collect-flyoff.tsx`
        // reads this element's live screen rect at the moment of collect.
        data-collect-target
      >
        <span className="label-mono text-fg-subtle">World</span>
        <span className="font-semibold tabular-nums text-fg">{points}</span>

        {multiplier > 1 ? (
          <motion.span
            key={multiplier}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-full bg-accent/10 px-2 py-0.5 font-medium tabular-nums text-accent"
          >
            ×{multiplier.toFixed(2).replace(/\.?0+$/, "")}
          </motion.span>
        ) : null}

        <GestureHint visible={hintVisible} />

        <button
          type="button"
          onClick={() => {
            // The click is a user gesture: unlock audio and confirm the flip
            // with a cue, both inside the same event.
            primeAudio();
            const next = toggle();
            playCue(next ? "toggle-on" : "toggle-off");
          }}
          aria-pressed={enabled}
          aria-label={enabled ? "Mute world sounds" : "Unmute world sounds"}
          className="rounded-full text-fg-subtle transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {enabled ? "🔊" : "🔇"}
        </button>
      </div>
    </motion.div>
  );
}

/**
 * The gesture hint, self-dismissing. A separate component so the chip itself
 * doesn't re-render when the hint expires.
 */
function GestureHint({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="hidden text-fg-subtle sm:inline"
    >
      drag · tap · hold to collect
    </motion.span>
  );
}
