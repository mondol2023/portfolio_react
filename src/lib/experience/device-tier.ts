/**
 * How much scene this device can afford.
 *
 * The spec asks for particle counts, geometry detail and post-processing to
 * scale with the hardware, and for the *core* experience to survive on the
 * weakest tier rather than being switched off. So the tier is a budget, not a
 * feature flag: every scene reads the same numbers and scales itself down,
 * which is why the shape below is all quantities and no booleans like
 * `showParticles`.
 *
 * Detection is deliberately crude. `deviceMemory` and `hardwareConcurrency` are
 * the only signals available before we have drawn a frame, and both are absent
 * or lied about in some browsers — so an unknown device is assumed to be `mid`
 * rather than `low`. Guessing low would quietly hand a flagship phone the
 * stripped-back scene forever, and nothing in the UI would explain why.
 */

export type Tier = "low" | "mid" | "high";

export interface SceneBudget {
  tier: Tier;
  /** Upper bound for the R3F `dpr` range. Retina at 3x is never worth it. */
  maxDpr: number;
  /** Background starfield / dust particle count. */
  particles: number;
  /** Sphere & torus segment counts for the hero core. */
  segments: number;
  /** Whether the scene may run its heavier shader passes. */
  postProcessing: boolean;
  /** Shadow maps cost a second render pass per light. */
  shadows: boolean;
  /** Skill-galaxy node count before the layout starts culling. */
  galaxyNodes: number;
}

const BUDGETS: Record<Tier, SceneBudget> = {
  low: {
    tier: "low",
    maxDpr: 1,
    particles: 600,
    segments: 24,
    postProcessing: false,
    shadows: false,
    galaxyNodes: 14,
  },
  mid: {
    tier: "mid",
    maxDpr: 1.5,
    particles: 2200,
    segments: 48,
    postProcessing: false,
    shadows: false,
    galaxyNodes: 22,
  },
  high: {
    tier: "high",
    maxDpr: 2,
    particles: 5000,
    segments: 96,
    postProcessing: true,
    shadows: true,
    galaxyNodes: 32,
  },
};

/** The budget a server render assumes, and the fallback for unknown hardware. */
export const DEFAULT_BUDGET = BUDGETS.mid;

export function budgetFor(tier: Tier): SceneBudget {
  return BUDGETS[tier];
}

/**
 * Reduced motion collapses the budget to its floor regardless of hardware.
 *
 * A visitor who asks for less motion is not asking for a lower frame rate, so
 * this is not simply `low`: particles drop to zero (they exist only to move)
 * while geometry detail stays at the requested tier, leaving a still, sharp
 * scene rather than a coarse one.
 */
export function stillBudget(budget: SceneBudget): SceneBudget {
  return { ...budget, particles: 0, postProcessing: false, shadows: false };
}

interface DeviceSignals {
  memory?: number;
  cores?: number;
  coarsePointer: boolean;
  width: number;
}

/** Exported for the test of the classifier itself, not for component use. */
export function classify({ memory, cores, coarsePointer, width }: DeviceSignals): Tier {
  // A coarse pointer on a small screen is a phone: cap it at `low` no matter
  // how many cores it reports, because thermal throttling — not raw core
  // count — is what actually decides whether the scene holds 60fps there.
  if (coarsePointer && width < 768) return "low";

  // `deviceMemory` is bucketed by the spec to 0.25/0.5/1/2/4/8, so <= 4 is a
  // genuinely constrained machine rather than a rounding artefact.
  if (memory !== undefined && memory <= 2) return "low";
  if (cores !== undefined && cores <= 2) return "low";

  if (memory !== undefined && memory >= 8 && cores !== undefined && cores >= 8) return "high";
  if (cores !== undefined && cores >= 12) return "high";

  return "mid";
}

/** Reads the live device signals. Browser-only — callers must guard for SSR. */
export function detectTier(): Tier {
  if (typeof window === "undefined") return DEFAULT_BUDGET.tier;

  const nav = navigator as Navigator & { deviceMemory?: number };

  return classify({
    memory: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
    coarsePointer: window.matchMedia?.("(pointer: coarse)").matches ?? false,
    width: window.innerWidth,
  });
}
