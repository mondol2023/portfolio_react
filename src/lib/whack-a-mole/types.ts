/** Lifecycle states the whack-a-mole game can be in. */
export enum GameState {
  IDLE = "IDLE",
  PLAYING = "PLAYING",
  WON = "WON",
  LOST = "LOST",
}

/** Which procedural 3D model (see `lib/whack-a-mole/creatures.ts`) a character renders as. */
export type CreatureKind = "goat" | "sheep" | "cat" | "fox";

/** A character that can pop out of a hole. */
export interface Character {
  id: CreatureKind;
  /** Kept for the `aria-label`/idle-screen copy — the hole itself renders `id` as a 3D model, not this glyph. */
  emoji: string;
  label: string;
  /** Score delta on a successful hit. Negative for the character to avoid. */
  points: number;
}

/** Where a single hole is in its pop-up/pop-down cycle. */
export type MolePhase = "empty" | "rising" | "up" | "hit" | "dizzy" | "descending";

export interface HoleMole {
  phase: MolePhase;
  character: Character | null;
  /** Bumped on every spawn so stale timers from a previous occupant can no-op. */
  token: number;
  /** Rise duration (ms) this mole spawned with, so its CSS transition matches its timer exactly. */
  riseMs: number;
  /** Idle rotation speed multiplier this mole spawned with — climbs as the game speeds up. */
  spinSpeed: number;
}
