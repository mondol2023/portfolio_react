/**
 * Per-project visual identity.
 *
 * The case study already has one storytelling system — four acts, one thread,
 * two signature beats, four canvas scenes. This is the layer that makes the
 * same system read as *this* project rather than as a template with the text
 * swapped: one identity per project, resolved from the slug, expressed through
 * the primitives the page already has.
 *
 * Three things read this file and nothing else does:
 *
 *   the motion   `story-motion.ts` bends its existing variants by the numbers
 *                in `motion` — how much of a heading's travel is vertical, how
 *                much is lateral, whether it settles inward or outward, how
 *                quickly a chapter's parts follow each other.
 *   the canvas   `scenes/story-scenes.ts` recomposes the same four scenes from
 *                the same four primitives with `scene` applied: where the light
 *                sits, how densely the field is populated, how fast it idles,
 *                how far apart its elements stand. No new primitive, no second
 *                renderer — the same room, arranged differently.
 *   the surface  `globals.css` keys off `data-identity`, which the page puts on
 *                the article and on every tone anchor. That half is static CSS,
 *                so it survives reduced motion intact: the motif is a
 *                composition before it is ever a movement.
 *
 * Everything here is *visual interpretation*. Nothing in this file asserts a
 * fact about a project, and nothing in it is ever rendered as text. A project
 * whose slug matches no identity gets `base`, which is the page exactly as it
 * was — so a future case study is never broken by not being listed here.
 */

export const PROJECT_IDENTITIES = ["base", "atlas", "beacon", "meridian", "signal"] as const;

export type ProjectIdentity = (typeof PROJECT_IDENTITIES)[number];

/** A project with no declared identity reads as the page always has. */
export const DEFAULT_IDENTITY: ProjectIdentity = "base";

export function isProjectIdentity(value: string | null | undefined): value is ProjectIdentity {
  return value != null && (PROJECT_IDENTITIES as readonly string[]).includes(value);
}

/**
 * How an element arrives, per identity.
 *
 * These are *multipliers on the existing vocabulary*, never absolute distances.
 * `story-motion.ts` still owns what a heading's travel is; this only says how
 * much of it is vertical, how much of it is lateral, and which side of 1 the
 * scale starts on. That constraint is what keeps four identities inside one
 * animation system instead of turning into four.
 */
export interface IdentityMotion {
  /** Share of the variant's own vertical travel that survives. */
  rise: number;
  /**
   * Lateral travel, in the same base units as the rise, signed. Negative
   * arrives from the left. Zero is the page's default — most identities have no
   * business moving sideways.
   */
  drift: number;
  /**
   * Which way a settling element scales, as a multiplier on the variant's own
   * distance from 1. `0` removes the settle entirely, `1` keeps it, and a
   * negative number inverts it — the element starts *larger* and contracts onto
   * its anchor instead of growing into it.
   */
  contract: number;
  /** Multiplier on the act's stagger step. Below 1 is crisper. */
  cadence: number;
  /** Multiplier on the two signature beats' duration, and on theirs only. */
  tempo: number;
  /**
   * How far a signature chapter's depth plane drifts against the scroll, as a
   * percentage of its own height. Replaces the single constant the plane used;
   * see `story-layers.tsx` for why it has to stay inside the plane's bleed.
   */
  signatureTravel: number;
}

/**
 * How the four canvas scenes are recomposed.
 *
 * Deltas and multipliers again, applied to the numbers `story-scenes.ts`
 * already had. The neutral profile is all zeroes and ones, which reproduces
 * today's scenes exactly — that is the test this layer has to pass before it is
 * allowed to change anything.
 */
export interface IdentityScene {
  /** Horizontal shift of the light and the vanishing point, in screen widths. */
  bias: number;
  /** Vertical shift of the same, positive being lower. */
  lift: number;
  /** Multiplier on the light's radius. */
  glow: number;
  /** Multiplier on the light's breathing amplitude. */
  pulse: number;
  /** Multiplier on element counts — how populated the field is. */
  populate: number;
  /** Multiplier on how far apart those elements stand. */
  spread: number;
  /** Multiplier on idle speeds. Below 1 is measured, above 1 is in transit. */
  tempo: number;
}

/**
 * The order a row of evidence assembles in.
 *
 * `pair` is the page's existing behaviour — frames pair by column so a desktop
 * row arrives together. The rest are the same idea re-timed: nothing moves that
 * did not move before, it simply starts in a different order.
 */
export type EvidenceFlow = "pair" | "orbit" | "block" | "sweep" | "propagate";

export interface IdentityProfile {
  /** Maintainer's note. Never rendered — this is not a claim about the work. */
  motif: string;
  motion: IdentityMotion;
  scene: IdentityScene;
  evidence: EvidenceFlow;
}

const NEUTRAL_SCENE: IdentityScene = {
  bias: 0,
  lift: 0,
  glow: 1,
  pulse: 1,
  populate: 1,
  spread: 1,
  tempo: 1,
};

export const PROJECT_IDENTITY: Record<ProjectIdentity, IdentityProfile> = {
  /**
   * The page as it was written. Every number here is the identity layer's
   * no-op, which is what makes it a safe fallback rather than a fifth look.
   */
  base: {
    motif: "The shared cinematic system, unmodulated.",
    motion: { rise: 1, drift: 0, contract: 1, cadence: 1, tempo: 1, signatureTravel: 1.5 },
    scene: NEUTRAL_SCENE,
    evidence: "pair",
  },

  /**
   * Atlas — analytical, spatial, orbital.
   *
   * Things arrive from slightly outside and contract onto their anchor rather
   * than growing into it: capture, not appearance. The light is raised and
   * widened so the field is read from above like a map, the graph is populated
   * denser and linked further — relationships held at a distance are what an
   * analytical field is for — and all of it idles slowly, because a measurement
   * does not hurry.
   */
  atlas: {
    motif: "Orbital capture: elements converge inward onto a measured centre.",
    motion: {
      rise: 0.7,
      drift: -0.5,
      contract: -0.6,
      cadence: 0.95,
      tempo: 1.05,
      signatureTravel: 1.4,
    },
    scene: { bias: 0, lift: -0.05, glow: 1.14, pulse: 0.85, populate: 1.2, spread: 1.18, tempo: 0.78 },
    evidence: "orbit",
  },

  /**
   * Beacon — modular, systematic, aligned.
   *
   * The only identity with no scale change at all. A library's parts do not
   * zoom into place, they *register*: travel is purely vertical, the step
   * between a chapter's parts is the shortest on the site, and a row of
   * evidence lands as one block. The field behind it is the sparsest and the
   * tightest — fewer, closer elements under a small centred light.
   */
  beacon: {
    motif: "Modular alignment: parts step into register, nothing scales.",
    motion: {
      rise: 0.85,
      drift: 0,
      contract: 0,
      cadence: 0.78,
      tempo: 0.95,
      signatureTravel: 0.7,
    },
    scene: { bias: 0, lift: 0, glow: 0.86, pulse: 0.7, populate: 0.8, spread: 0.78, tempo: 0.85 },
    evidence: "block",
  },

  /**
   * Meridian — directional, temporal, in transit.
   *
   * The one identity that travels sideways. Most of the vertical distance is
   * traded for lateral distance, the light and the vanishing point are pushed
   * off-axis so the field has a direction, the step between beats is the
   * longest on the site — a timeline is a rhythm — and evidence sweeps across a
   * row rather than landing on it.
   */
  meridian: {
    motif: "Directional travel: the story moves across, and arrives.",
    motion: {
      rise: 0.35,
      drift: 1.15,
      contract: 0.4,
      cadence: 1.18,
      tempo: 1.1,
      signatureTravel: 2.1,
    },
    scene: { bias: 0.17, lift: 0.04, glow: 0.96, pulse: 0.8, populate: 0.95, spread: 1.06, tempo: 1.3 },
    evidence: "sweep",
  },

  /**
   * Signal — pulse, propagation, resolution.
   *
   * Elements expand into place from noticeably under size, which is the one
   * gesture on the site that reads as transmission rather than arrival. The
   * light breathes at more than twice the amplitude of any other identity and
   * nothing else in the scene is loud, so the pulse is unmistakably the
   * subject; evidence propagates outward from the lead frame.
   */
  signal: {
    motif: "Pulse and propagation, converging on the artifact.",
    motion: {
      rise: 0.55,
      drift: 0,
      contract: 1.7,
      cadence: 0.88,
      tempo: 1.12,
      signatureTravel: 1.7,
    },
    scene: { bias: 0, lift: 0.02, glow: 1.06, pulse: 2.4, populate: 0.92, spread: 0.86, tempo: 1.05 },
    evidence: "propagate",
  },
};

export function identityProfile(identity: ProjectIdentity): IdentityProfile {
  return PROJECT_IDENTITY[identity];
}

/** Convenience for the many call sites that only want the motion character. */
export function identityMotion(identity: ProjectIdentity = DEFAULT_IDENTITY): IdentityMotion {
  return PROJECT_IDENTITY[identity].motion;
}

/**
 * Which identity a project wears.
 *
 * Matched on whole words in the slug, falling back to the title, so a project
 * renamed `atlas-v2` keeps its identity while a project called
 * `atlas-of-typefaces` still resolves by the same rule rather than by a
 * substring accident — the word has to *be* a token.
 *
 * An unknown project resolves to `base` rather than to a hash of its slug.
 * Handing an unlisted case study a visual personality nobody designed for it
 * would be inventing something about it, and the fallback the page actually
 * wants is "the system, unmodulated".
 */
const IDENTITY_BY_TOKEN: Record<string, ProjectIdentity> = {
  atlas: "atlas",
  beacon: "beacon",
  meridian: "meridian",
  signal: "signal",
};

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function identityForProject(slug: string, title?: string): ProjectIdentity {
  for (const token of tokens(slug)) {
    const match = IDENTITY_BY_TOKEN[token];
    if (match) return match;
  }

  if (title) {
    for (const token of tokens(title)) {
      const match = IDENTITY_BY_TOKEN[token];
      if (match) return match;
    }
  }

  return DEFAULT_IDENTITY;
}
