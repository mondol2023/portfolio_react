"use client";

import { useContext } from "react";

import { QuestContext } from "./quest-context";
import { MAX_LEVEL, QUEST_LEVELS, XP_TARGET } from "./quest-constants";
import type { QuestContextValue } from "./quest-types";

/**
 * Reads the quest store.
 *
 * Throws rather than falling back to a no-op: a silent no-op would mean a
 * component quietly stopped awarding XP the day someone moved it outside the
 * provider, and nothing would look broken until the bar never filled.
 * `QuestProvider` sits in the root layout precisely so this cannot happen —
 * `/play` and `/projects/[slug]` are outside the `(site)` group and still need
 * to record progress.
 */
export function useQuest(): QuestContextValue {
  const context = useContext(QuestContext);
  if (!context) {
    throw new Error("useQuest must be used inside <QuestProvider>.");
  }
  return context;
}

export interface QuestProgress {
  level: number;
  maxLevel: number;
  label: string;
  xp: number;
  /** 0–1, clamped. Overshooting the target is expected and simply reads full. */
  ratio: number;
  percent: number;
}

/**
 * The subset the HUD renders, derived in one place so the pill and the bar can
 * never disagree about which level the visitor is on.
 */
export function useQuestProgress(): QuestProgress {
  const { currentLevel, xp } = useQuest();

  const entry = QUEST_LEVELS.find((item) => item.level === currentLevel) ?? QUEST_LEVELS[0];
  const ratio = Math.min(1, Math.max(0, xp / XP_TARGET));

  return {
    level: entry.level,
    maxLevel: MAX_LEVEL,
    label: entry.label,
    xp,
    ratio,
    percent: Math.round(ratio * 100),
  };
}
