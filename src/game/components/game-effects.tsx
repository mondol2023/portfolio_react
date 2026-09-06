"use client";

/**
 * Reserved slot for the world's render effects (bloom/glow passes, vignette).
 *
 * Phase 2 ships it as a no-op so the public API is stable from day one; the
 * implementation lands with Phase 5 and will be gated on the budget's
 * `particleBudget`/tier so low-end devices never pay for post-processing.
 */
export function GameEffects() {
  return null;
}
