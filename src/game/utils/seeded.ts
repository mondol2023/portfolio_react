/**
 * Deterministic pseudo-randomness for generated placement.
 *
 * Every scatter in this module (spawn positions, particle bursts, ambient
 * placement) runs inside render-time memos or frame loops where `Math.random`
 * is an impurity: a re-render would reshuffle the world mid-session. A seeded
 * generator makes placement reproducible for a given seed.
 *
 * The same mulberry32 algorithm the host site uses in `lib/experience/random.ts`
 * — duplicated, not imported, so `src/game` stays a portable module.
 */
export type Random = () => number;

export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform float in `[min, max)`. */
export function randRange(min: number, max: number, random: Random): number {
  return min + random() * (max - min);
}

/** Uniform element of a non-empty list; `undefined` only for an empty list. */
export function pick<T>(list: readonly T[], random: Random): T | undefined {
  if (list.length === 0) return undefined;
  const index = Math.floor(random() * list.length);
  return list[index];
}
