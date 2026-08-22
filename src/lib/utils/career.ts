import type { Experience } from "@/lib/types/content";

/**
 * The profile's LEVEL and XP, derived from the real work history.
 *
 * The brief asks for a game HUD with a level and an experience bar. The
 * temptation is to invent both, but a made-up number in a portfolio is a
 * made-up number about the person — so the level is simply the count of full
 * years since the earliest role began, and the XP bar is how far through the
 * current year they are. Both move on their own, neither can be wrong, and
 * nothing has to be maintained by hand in the dashboard.
 *
 * `now` is read here rather than in a component: the clock is not a pure value,
 * and the page that calls this is statically rendered and revalidated, so the
 * level is recomputed on the same schedule as the rest of the content.
 */

export interface PlayerLevel {
  /** Full years since the first role started. Never below 1. */
  level: number;
  /** 0..1 through the current year — what fills the XP bar. */
  progress: number;
  /** Calendar year the history starts in, for the caption. */
  startYear: number;
}

const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;

export function playerLevel(
  experiences: readonly Experience[],
  now: number = Date.now(),
): PlayerLevel | null {
  let earliest = Number.POSITIVE_INFINITY;

  for (const experience of experiences) {
    const started = Date.parse(experience.startDate);
    // Firestore holds these as free-entry dates; an unparseable one should drop
    // out of the calculation rather than turn the whole level into NaN.
    if (Number.isFinite(started) && started < earliest) earliest = started;
  }

  if (!Number.isFinite(earliest) || earliest > now) return null;

  const elapsed = (now - earliest) / MS_PER_YEAR;

  return {
    level: Math.max(1, Math.floor(elapsed)),
    // The fractional part *is* the progress toward the next level, which is why
    // there is no separate "XP required" number to invent.
    progress: elapsed < 1 ? elapsed : elapsed - Math.floor(elapsed),
    startYear: new Date(earliest).getUTCFullYear(),
  };
}
