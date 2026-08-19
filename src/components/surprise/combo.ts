import { shuffled, type SurpriseEffect } from "./effect";
import { SURPRISE_EFFECTS } from "./effects";

/**
 * Deciding what the next press does.
 *
 * Two promises to keep, and they pull in opposite directions.
 *
 * The first is that a press is never a repeat. Not "rarely" — never. Every
 * effect that was running is struck out of the pool before anything is drawn,
 * so consecutive presses cannot share so much as one ingredient. With a
 * registry this size that costs almost nothing, and it is the difference
 * between a button that feels generous and one that feels like a coin flip.
 *
 * The second is that the results have to *compose*. Between one and three
 * effects run at once, and left to chance a draw of three will eventually be
 * two backdrops fighting for the same pixels and a dimming sheet on top of a
 * spotlight. Three rules prevent that, in order of how often they bite:
 *
 *   1. One effect per channel. Two typefaces, two backdrops, two overlays —
 *      the channel is the declaration of what an effect owns, and owning it
 *      twice is a collision by definition.
 *   2. At most one `loud` effect. Quiet effects are what make a loud one
 *      legible; two showstoppers just cancel out.
 *   3. Declared conflicts, checked in both directions, for the clashes the
 *      channel rule cannot see — a monochrome palette under rainbow lettering.
 *
 * Selection is greedy over a shuffled pool rather than a search for a valid
 * set. Greedy can fall short of the target size, which is fine: it means the
 * page occasionally gets two effects when it drew three, and never means it
 * gets a bad pair.
 */

/**
 * How many effects a press plays.
 *
 * Weighted toward two. One is often too little to feel like a surprise; three
 * is the ceiling because a fourth simultaneous change is no longer legible as a
 * change — the reader just sees a different site.
 */
const SIZE_WEIGHTS = [
  { size: 1, weight: 26 },
  { size: 2, weight: 44 },
  { size: 3, weight: 30 },
] as const;

function rollSize(): number {
  const total = SIZE_WEIGHTS.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;

  for (const entry of SIZE_WEIGHTS) {
    roll -= entry.weight;
    if (roll <= 0) return entry.size;
  }

  return 2;
}

/** Conflicts are declared on one side and enforced on both. */
function clashes(a: SurpriseEffect, b: SurpriseEffect): boolean {
  return Boolean(a.conflicts?.includes(b.id) || b.conflicts?.includes(a.id));
}

function fits(
  candidate: SurpriseEffect,
  chosen: readonly SurpriseEffect[],
  pinned: readonly SurpriseEffect[],
): boolean {
  // At most four entries between them, so the copy is cheaper than three
  // near-identical passes over two lists.
  const taken = [...pinned, ...chosen];

  if (taken.some((picked) => picked.channel === candidate.channel)) return false;
  if (candidate.loud && taken.some((picked) => picked.loud)) return false;

  return !taken.some((picked) => clashes(picked, candidate));
}

/**
 * Draws the next set.
 *
 * @param previous What is on the page now. Every id in it is excluded.
 * @param allowAnimated False under `prefers-reduced-motion`, which drops the
 *   moving effects from the pool entirely rather than slowing them down.
 * @param pinned What the dashboard has switched on permanently. These are not
 *   the button's to draw or to replace, so they are excluded from the pool —
 *   and the three composition rules are checked against them as well, because a
 *   pinned backdrop is just as much a backdrop as a drawn one.
 */
export function pickCombo(
  previous: readonly SurpriseEffect[],
  allowAnimated: boolean,
  pinned: readonly SurpriseEffect[] = [],
): SurpriseEffect[] {
  const used = new Set([...previous, ...pinned].map((effect) => effect.id));

  const eligible = SURPRISE_EFFECTS.filter(
    (effect) => (allowAnimated || !effect.animated) && !used.has(effect.id),
  );

  /*
   * Only reachable if the registry shrinks to roughly the size of one draw.
   * Repeating something beats doing nothing when a button says "Surprise".
   */
  const pinnedIds = new Set(pinned.map((effect) => effect.id));

  const pool = eligible.length > 0
    ? eligible
    : SURPRISE_EFFECTS.filter(
        (effect) => (allowAnimated || !effect.animated) && !pinnedIds.has(effect.id),
      );

  // Reduced motion leaves a smaller, all-static pool; three at once out of it
  // would exhaust the quiet effects in two presses.
  const target = Math.min(allowAnimated ? rollSize() : Math.min(rollSize(), 2), pool.length);

  const chosen: SurpriseEffect[] = [];

  for (const candidate of shuffled(pool)) {
    if (chosen.length >= target) break;
    if (fits(candidate, chosen, pinned)) chosen.push(candidate);
  }

  return chosen;
}

/**
 * The one-line summary shown in the live region.
 *
 * Effects word their labels as complete statements, so they join with a
 * separator rather than being rewritten into a list.
 */
export function describeCombo(effects: readonly SurpriseEffect[]): string {
  return effects.map((effect) => effect.label).join(" · ");
}
