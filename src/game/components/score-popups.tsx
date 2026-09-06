"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { gameBus } from "../events/game-bus";

import type { Unsubscribe } from "../utils/event-bus";

interface ScorePopup {
  id: number;
  label: string;
  tone: "merge" | "split" | "collect";
}

const LABELS: Record<ScorePopup["tone"], string> = {
  merge: "merged!",
  split: "split!",
  collect: "collected!",
};

/**
 * Transient "+N" notices floating above the score chip.
 *
 * Subscribes to the world's score events and renders a small, self-expiring
 * stack — Motion owns all overlay animation, per the module's split of
 * responsibilities. The stack is capped so a burst of merges can't queue
 * unbounded DOM churn.
 */
export function ScorePopups() {
  const [popups, setPopups] = useState<ScorePopup[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const unsubscribe: Unsubscribe = gameBus.on((event) => {
      if (event.type !== "score" || event.delta <= 0) return;

      const tone = event.delta >= 40 ? "collect" : event.delta >= 15 ? "merge" : "split";
      const popup: ScorePopup = { id: nextId.current++, label: `+${event.delta} ${LABELS[tone]}`, tone };

      setPopups((current) => [...current.slice(-3), popup]);
      setTimeout(() => {
        setPopups((current) => current.filter((candidate) => candidate.id !== popup.id));
      }, 1400);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 mb-3 flex -translate-x-1/2 flex-col items-center gap-1" aria-hidden="true">
      <AnimatePresence initial={false}>
        {popups.map((popup) => (
          <motion.span
            key={popup.id}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent backdrop-blur-sm"
          >
            {popup.label}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
