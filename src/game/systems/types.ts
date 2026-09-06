import type { Camera } from "three";

/** Re-exported so the systems folder's contract is self-contained. */
export type { GameBudget } from "../types/game";

/**
 * The contract every world system implements.
 *
 * A system is plain logic with a frame tick — no React, no JSX. Components
 * stay lightweight declarators; everything that *decides* lives behind this
 * interface and is ticked exactly once per frame by the `SystemRunner`, in a
 * deterministic order (see `systems/index.ts`).
 */
export interface GameSystem {
  readonly id: string;
  /** Called once per frame while the world is mounted and visible. */
  update(context: SystemContext): void;
  /** Called once when the world unmounts — drop listeners, tweens, contexts. */
  dispose?(): void;
}

export interface SystemContext {
  /** Seconds since the previous frame. */
  delta: number;
  /** `performance.now()` at the start of the frame, in ms. */
  now: number;
  /** Seconds since the runner mounted. */
  elapsed: number;
  /** The render camera — read fresh from the frame state, never captured. */
  camera: Camera;
  /** Whether the document is currently visible. */
  visible: boolean;
}
