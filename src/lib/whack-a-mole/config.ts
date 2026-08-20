/**
 * Tunable constants for the whack-a-mole game.
 *
 * Kept in one file so difficulty/pacing can be balanced without hunting
 * through the hook that consumes it.
 */
export const WHACK_CONFIG = {
  rows: 3,
  cols: 3,

  /** Score starts in the middle so a good or bad first hit both matter. */
  startScore: 50,
  winScore: 100,
  loseScore: 0,

  goodPoints: 5,
  badPoints: -10,

  /** How often a new mole is attempted, in ms. Shrinks as the player scores. */
  initialSpawnIntervalMs: 1000,
  minSpawnIntervalMs: 380,
  /** How long a mole takes to rise into a hittable position. Shrinks over time. */
  initialRiseMs: 480,
  minRiseMs: 170,
  /** How long a mole stays up before it's missed. Shrinks over time. */
  initialUpMs: 780,
  minUpMs: 260,
  /** How long the impact reaction (grayscale squash + blast ring) shows before the dizzy-stars phase begins. */
  impactMs: 140,
  /** How long the hit character spins with stars overhead before it drops. */
  dizzyMs: 520,
  /** How long the pop-down animation takes — kept roughly in step with the hammer's strike sequence above. */
  descendMs: 340,

  /** Every N hits, timings are multiplied by `difficultyFactor` (game gets faster). */
  difficultyStepHits: 3,
  difficultyFactor: 0.85,

  /**
   * Hammer strike choreography, in ms from the moment a hole is clicked.
   * Shared between `useWhackAMole` (when the hole itself is allowed to react)
   * and `HammerCursor` (the visual swing) so the hole's hit reaction can never
   * drift out of sync with — and in particular can never fire before — the
   * hammer actually finishing its grow-onto-the-hole motion.
   */
  hammerAppearMs: 100, // puff-out at home finishes, hammer appears above the hole at rest size
  hammerBlastMs: 250, // hammer starts enlarging onto the hole (the "grow" swing)
  hammerImpactMs: 410, // hammer has fully grown onto the hole — the actual hit; the hole reacts starting here
  hammerIdleMs: 520, // hammer has faded out at the hole — jump back home and fade back in

  /** Idle 3D rotation speed multiplier for the creatures — ramps up in step with the timings above, so the board reads as speeding up all over, not just in spawn rate. */
  initialSpinSpeed: 1,
  maxSpinSpeed: 2.8,
} as const;
