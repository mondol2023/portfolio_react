/** Lifecycle states the game engine can be in. */
export enum GameState {
  IDLE = "IDLE",
  PLAYING = "PLAYING",
  PAUSED = "PAUSED",
  GAME_OVER = "GAME_OVER",
}

/** Events the engine emits, and the payload each one carries. */
export interface GameEvents extends Record<string, unknown> {
  statechange: GameState;
  score: number;
}
