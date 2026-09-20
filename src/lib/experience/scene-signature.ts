/**
 * Beat maths for the signature moment (§5), published like `sceneScroll` — a
 * per-frame singleton, because re-rendering the canvas at that rate is what the
 * performance contract forbids. Free of `three` so the DOM side can read it,
 * and scrubbed rather than timed so the moment can never trap the reader.
 */

import { easeInOutSine } from "./scene-motion";

/**
 * `full` is §5's five beats; `compressed` (low tier, mobile, already seen)
 * folds beats 2–4 into one; `dissolve` is reduced motion's cross-fade only.
 */
export type SignatureMode = "off" | "full" | "compressed" | "dissolve";

export interface SignatureState {
  mode: SignatureMode;
  /** True only while the moment is actually mid-play; consumers skip the whole path otherwise. */
  active: boolean;
  /** 0–1 across the moment's own scroll window. */
  t: number;
  /** How completely the moment owns the boundary's ordinary choreography. */
  takeover: number;
  /** Camera offset along the corridor axis, in world units. Positive is toward the wall. */
  push: number;
  /** The lead panel coming forward and growing to fill the frame, 0–1. */
  commit: number;
  /** The stillness beat. Consumers multiply idle motion by `1 - hold`. */
  hold: number;
  /** The surface breaking outward past the camera, 0–1. */
  release: number;
  /** How far everything that is not the lead panel has dimmed, 0–1. */
  dim: number;
  /** Whether the release is a shatter (`full`) or a dissolve (everything else). */
  shatter: boolean;
}

const RESTING: SignatureState = {
  mode: "off",
  active: false,
  t: 0,
  takeover: 0,
  push: 0,
  commit: 0,
  hold: 0,
  release: 0,
  dim: 0,
  shatter: false,
};

export const signature: SignatureState = { ...RESTING };

/** Put the scene back to ordinary choreography — on unmount, or when the switch goes off. */
export function resetSignature(): void {
  Object.assign(signature, RESTING);
}

/** The waypoint span the moment lives on: Projects (3) → Experience (4). */
export const SIGNATURE_SECTION_INDEX = 3;

// After the corridor's dwell, ending before Experience's entrance does: beat 4
// only reads if the room behind the panel was lit before the wall came apart.
const WINDOW_FROM = 0.2;
const WINDOW_TO = 0.86;

/**
 * Beat edges as fractions of the window. `full` is §5's 0/600/1100/1500/2600/
 * 3200ms table; `compressed` keeps its approach and settle but spends 900ms on
 * the middle three; `dissolve` is a cross-fade and nothing else.
 */
const STOPS: Record<Exclude<SignatureMode, "off">, readonly number[]> = {
  full: [0, 0.1875, 0.34375, 0.46875, 0.8125, 1],
  compressed: [0, 0.2857, 0.5, 0.5, 0.7143, 1],
  dissolve: [0, 0.44, 0.5, 0.5, 0.56, 1],
};

/** Beat values at those edges — one row per beat, left to right. */
const PUSH = [0, 0.45, 1, 1, -0.55, 0] as const;
const COMMIT = [0, 0.12, 1, 1, 1, 1] as const;
const HOLD = [0, 0, 1, 1, 0, 0] as const;
const RELEASE = [0, 0, 0, 0, 1, 1] as const;
const DIM = [0, 1, 1, 1, 0.6, 0] as const;
const TAKEOVER = [0, 1, 1, 1, 1, 0] as const;

/** How far the camera pushes toward the wall at full commit, in world units. */
const PUSH_DISTANCE = 1.5;
/** Amplitude the compressed variant plays at — the same shape with less of it. */
const COMPRESSED_SCALE = 0.5;
/** Reduced motion still dims, but partially — a full blackout reads as motion. */
const DISSOLVE_DIM = 0.55;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** A value read off the beat table, eased across each segment so no edge is a corner. */
function keyframe(t: number, stops: readonly number[], values: readonly number[]): number {
  const last = stops.length - 1;
  if (t <= (stops[0] ?? 0)) return values[0] ?? 0;
  if (t >= (stops[last] ?? 1)) return values[last] ?? 0;

  let i = 0;
  while (i < last && t >= (stops[i + 1] ?? 1)) i += 1;
  const a = stops[i] ?? 0;
  const b = stops[i + 1] ?? a;
  // A zero-length segment is how `compressed` merges two beats: step straight on.
  const local = b > a ? easeInOutSine((t - a) / (b - a)) : 1;
  return lerp(values[i] ?? 0, values[i + 1] ?? 0, local);
}

/** The moment's own 0–1 ramp from raw section-span progress. */
export function signatureRamp(spanProgress: number): number {
  const t = (spanProgress - WINDOW_FROM) / (WINDOW_TO - WINDOW_FROM);
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Every beat at `t`, for `mode`. Pure — `<SignatureMoment>` is the only caller. */
export function signatureAt(t: number, mode: SignatureMode): SignatureState {
  if (mode === "off") return { ...RESTING };

  const stops = STOPS[mode];
  const still = mode === "dissolve";
  const scale = mode === "compressed" ? COMPRESSED_SCALE : 1;

  return {
    mode,
    active: t > 0 && t < 1,
    t,
    // Reduced motion has nothing to take over, because nothing collapses.
    takeover: still ? 0 : keyframe(t, stops, TAKEOVER),
    push: still ? 0 : keyframe(t, stops, PUSH) * PUSH_DISTANCE * scale,
    commit: still ? 0 : keyframe(t, stops, COMMIT),
    hold: still ? 0 : keyframe(t, stops, HOLD),
    release: still ? 0 : keyframe(t, stops, RELEASE),
    dim: keyframe(t, stops, DIM) * (still ? DISSOLVE_DIM : 1),
    shatter: mode === "full",
  };
}
