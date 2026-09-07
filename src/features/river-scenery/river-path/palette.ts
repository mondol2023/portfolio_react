/**
 * The Bangladesh day-cycle palette behind the river-path scene.
 *
 * A dawn → day → dusk → night progression in `oklch()`, matching the rest of
 * the surprise kit. Sourced from 3D-SCENE-CONCEPT.md §6 (the flag's green and
 * red, ripe paddy, terracotta brick, the night sky).
 */

/** Skyline silhouettes, boat hulls. */
export const RIVER_INK = "oklch(0.16 0.02 250)";
/** Firefly/star glow. */
export const RIVER_CREAM = "oklch(0.95 0.02 85)";
/** Ripe paddy, dusk light. */
export const RIVER_GOLD = "oklch(0.8 0.15 85)";
/** Terracotta brick relief accent on the skyline. */
export const RIVER_TERRACOTTA = "oklch(0.55 0.12 40)";
/** Flag green, used for the paddy stalks. */
export const RIVER_GREEN = "oklch(0.55 0.13 155)";

/** Sky colour at each stage — top of the day-cycle gradient. */
export const SKY_STOPS = {
  dawn: "oklch(0.78 0.09 55)",
  day: "oklch(0.82 0.08 220)",
  dusk: "oklch(0.62 0.16 30)",
  night: "oklch(0.22 0.06 265)",
} as const;

/** Water colour at each stage — bottom of the day-cycle gradient, always darker than its sky. */
export const WATER_STOPS = {
  dawn: "oklch(0.55 0.08 210)",
  day: "oklch(0.5 0.09 215)",
  dusk: "oklch(0.4 0.12 270)",
  night: "oklch(0.12 0.04 265)",
} as const;
