import type { GameBudget, GameSettings } from "../types/game";

/**
 * Every tunable number of the world, gathered in one place — the same
 * discipline as the host's `lib/game/game-config.ts` and
 * `lib/experience/springs.ts`: systems read named constants instead of
 * inlining magic numbers, so retuning the feel is a single-file edit.
 *
 * Units: world units, seconds or milliseconds, m/s. Timestamps are
 * `performance.now()`-based.
 */

/** The play volume, in world units from the origin. Camera sees roughly this box. */
export const WORLD_BOUNDS = {
  /** Horizontal half-extent. */
  x: 7.5,
  /** Vertical extent the spawn field targets. */
  yTop: 5,
  yBottom: -4,
  /** Depth half-extent — a shallow slab keeps shapes readable behind text. */
  z: 2.5,
  /** A shape whose body falls below this Y is recycled (it left the world). */
  killY: -9,
} as const;

export const SPAWN_RULES = {
  /** Spawn positions shrink inside the bounds by this margin. */
  marginInside: 0.9,
  /** Minimum distance between two fresh spawns, so shapes never overlap on arrival. */
  minSeparation: 1.7,
  /** Placement attempts before accepting a slightly-clumped position. */
  maxAttempts: 24,
  /** Delay before the spawn system refills a missing shape. */
  respawnDelayMs: 700,
  /** Initial downward drift so spawns feel like they arrive, not pop in. */
  entryImpulse: -0.8,
  /** Overshoot scale-in window for every arrival (spawn, respawn, merge result). */
  introMs: 260,
} as const;

export const INTERACTION = {
  /**
   * DOM elements a press may never start a world grab from. Everything here
   * is either interactive (links, buttons, form fields) or carries prose the
   * visitor may be trying to select. The canvas has no pointer events at all
   * — this filter is what makes window-level interaction safe over content.
   */
  targetBlocklist:
    "a, button, input, textarea, select, label, summary, p, h1, h2, h3, h4, h5, h6, li, td, th, code, pre, blockquote, figcaption, [contenteditable], [role='button'], [data-game-ignore]",
  /** Drag spring pulling a grabbed body toward the pointer ray target. */
  dragStiffness: 10,
  /** Safety clamp on dragged-body speed, m/s. */
  maxDragSpeed: 16,
  /** Pointer-release speed above this counts as a throw. */
  flickSpeed: 4.5,
  /** Extra energy multiplier applied on release, so throws feel weighty. */
  throwMultiplier: 1.4,
  /** Press-and-hold duration that collects a shape. */
  longPressMs: 380,
  /** Pointer travel (px) and duration (ms) within which a press is a tap. */
  tapMaxDistancePx: 8,
  tapMaxDurationMs: 280,
  /** How far a shape's glow-pulse scale rises while hovered. */
  hoverScale: 1.12,
} as const;

/**
 * Zero-g containment.
 *
 * The world has no floor: gravity is zero and each body is softly pulled
 * toward the spot it spawned at, which keeps the population floating in the
 * visible slab behind the content instead of drifting off into the void.
 */
export const CONTAINMENT = {
  /** Spring strength toward the body's home position. */
  homeStiffness: 0.9,
  /** Velocity damping factor (fraction of velocity retained per second). */
  velocityDamping: 1.6,
  /** Angular velocity damping, same units. */
  angularDamping: 2.2,
  /** Safety clamp on free-body speed, m/s. */
  maxSpeed: 8,
} as const;

export const MERGE_RULES = {
  /** Fresh shapes refuse to merge for this long after spawning. */
  spawnLockMs: 900,
  /**
   * How deeply two bodies must interpenetrate before they count as
   * overlapping, as a fraction of the smaller one's radius. Touching alone is
   * not enough — shapes drift into each other constantly in zero-g, and
   * fusing on first contact would make the population collapse on sight.
   */
  overlapRatio: 0.22,
  /** Grace before the merge result itself may merge onward. */
  resultLockMs: 1100,
  /** Telegraph window between a valid contact and the actual fuse. */
  chargeMs: 220,
} as const;

/**
 * How two overlapping shapes combine into one.
 *
 * The governing idea is conservation: the result owns the *sum* of what went
 * in — volume, mass, durability, worth — so fusing is never a way to lose
 * material, and a big composite reads as big because it genuinely is. See
 * `config/fusion.ts` for how a recipe is identified and
 * `config/shape-registry.ts` for the arithmetic these knobs feed.
 */
export const FUSION = {
  /**
   * Authored species one composite may contain before it stops fusing onward.
   * Without a ceiling a single blob eventually eats the whole population; four
   * keeps the biggest shape readable inside the containment slab.
   */
  maxParts: 4,
  /** Multiplier on the summed value of the parts — fusing pays better than collecting separately. */
  valueBonus: 1.25,
  /** Poke health ceiling, however many parts a composite carries. */
  maxDurability: 9,
  /**
   * How far each part sits from the composite's centre, as a fraction of its
   * own (post-scale) radius. Below 1 so parts always interpenetrate: the
   * result must read as one fused body, never as a loose cluster.
   */
  partOffset: 0.7,
  /** Out-of-plane share of that offset, so a fusion is never a flat pinwheel. */
  partRise: 0.6,
  /** Tilt in radians applied per part, so repeated ingredients don't look cloned. */
  partTilt: 0.7,
  /** Extra emissive intensity each part beyond the first adds, as a fraction of the blend. */
  emissiveStep: 0.18,
} as const;

export const SPLIT_RULES = {
  /** Health removed per poke (one tap). */
  damagePerPoke: 1,
  /** Fragments a shape breaks into. */
  fragmentCount: 3,
  /** Fragment lifetime, ms — they shrink and vanish over this window. */
  fragmentLifetimeMs: 1600,
  /** Radial impulse each fragment receives on top of inherited velocity, m/s. */
  fragmentImpulse: 2.6,
  /** Fragment scale relative to the parent shape. */
  fragmentScale: 0.55,
  /** Telegraph window between zero-health and the actual break. */
  telegraphMs: 130,
} as const;

export const SCORE_RULES = {
  /** Multiplier gained per scoring event while the combo is hot. */
  multiplierStep: 0.25,
  /** Multiplier ceiling. */
  multiplierMax: 3,
  /** Idle time after the last scoring event before decay begins, ms. */
  multiplierDecayDelayMs: 4000,
  /** Multiplier shed per decay tick once the combo has gone cold. */
  multiplierDecayStep: 0.5,
  /** How often decay ticks, ms. */
  multiplierDecayIntervalMs: 1200,
} as const;

export const PARTICLES = {
  mergeBurst: 26,
  splitBurst: 18,
  collectBurst: 36,
  /** Particle lifetime, ms. */
  lifetimeMs: 900,
  /** Particles drift down gently; much lighter than the world's gravity. */
  gravity: -1.4,
  /** Initial speed range, m/s. */
  speedMin: 0.6,
  speedMax: 2.8,
} as const;

export const AUDIO_RULES = {
  masterVolume: 0.5,
} as const;

/** Camera rig pose. `scrollDriftY` is how far the rig drifts across a full page scroll. */
export const CAMERA = {
  fov: 50,
  position: [0, 0.5, 9.5] as [number, number, number],
  scrollDriftY: 2.2,
  /** Exponential smoothing rate for the drift (see `damp`). */
  driftLambda: 3.5,
  /** Shake impulse added on a merge/split/collect event, world units. */
  shakeMerge: 0.09,
  shakeSplit: 0.05,
  shakeCollect: 0.03,
  /** Exponential decay rate of accumulated shake, per second. */
  shakeDecay: 6,
} as const;

/** Fine per-shape feedback constants for merge/split telegraphs and spawn pop-in. */
export const ANIMATION_FEEL = {
  /** Exponential smoothing rate for state-driven mesh scale (hover/merge/intro). */
  meshSmoothing: 16,
  /** How far above a species' base emissive intensity a mid-merge flash rises. */
  mergeFlashBoost: 0.9,
  /** Peak scale bump from the merge charge's converging pulse. */
  mergePulseAmplitude: 0.22,
  /** Extra steady scale growth as a charge nears completion. */
  mergePulseGrowth: 0.1,
  /** Local-position tremble amplitude for a shape mid-split-telegraph, world units. */
  splitJitterAmount: 0.035,
  /** Damped-sine overshoot decay/frequency for every arrival's spawn-intro pop. */
  introOvershootDecay: 6,
  introOvershootFreq: 2.2,
} as const;

/** Non-uniform scale applied to a dragged/thrown shape's group, along/against velocity. */
export const DRAG_FEEL = {
  /** Maximum stretch/compress amount at full speed. */
  stretchMax: 0.35,
  /** Exponential smoothing rate easing toward the target stretch. */
  stretchLambda: 10,
  /** Speed below which no stretch is applied, m/s. */
  minSpeed: 2.5,
} as const;

/** Small pool of expanding, fading rings that punctuate merge/split/collect impacts. */
export const IMPACT_RINGS = {
  /** Live ring capacity — impacts beyond this recycle the oldest. */
  pool: 6,
  lifetimeMs: 480,
  startScale: 0.2,
  endScale: 2.4,
  startOpacity: 0.85,
} as const;

/**
 * Hold-to-collect charge ring and fly-off ghost — pure HTML overlay, sized in
 * px/ms rather than world units. Kept here anyway, alongside every other
 * tunable, instead of inlined in the components themselves.
 */
export const COLLECT_FEEL = {
  ringDiameterPx: 44,
  ringStrokeWidthPx: 3,
  /** Ghost travel time from the collected shape's screen point to the HUD chip. */
  flyoffDurationMs: 550,
} as const;

/** Budget presets, mirroring the host site's low/mid/high tier philosophy. */
export const BUDGET_PRESETS: Record<"low" | "mid" | "high", GameBudget> = {
  low: { maxDpr: 1, ambientCount: 30, interactiveCount: 6, particleBudget: 60 },
  mid: { maxDpr: 1.5, ambientCount: 60, interactiveCount: 9, particleBudget: 120 },
  high: { maxDpr: 2, ambientCount: 100, interactiveCount: 12, particleBudget: 200 },
};

/** The settings a host gets when it passes nothing. */
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  budget: BUDGET_PRESETS.mid,
  // Zero-g: `CONTAINMENT` in this file does the work gravity would, softly,
  // so shapes hover behind the content instead of raining off-screen.
  gravity: 0,
};
