import { playCue } from "../audio/audio-controller";
import { gameBus } from "../events/game-bus";

import type { GameSystem } from "./types";
import type { Unsubscribe } from "../utils/event-bus";

/**
 * Routes world events to the synthesised cues.
 *
 * Cue ownership is deliberately split so nothing ever sounds twice:
 * - **This system** owns events with no better owner — currently the
 *   spawn chime (the spawn system emits and forgets).
 * - **The score system** owns scoring cues (merge / split / collect).
 * - **The gesture controller** owns gesture-synced cues (poke / throw),
 *   which must fire inside the user gesture that produced them.
 *
 * The `update` tick is intentionally frameless; the system rides the runner
 * purely so its subscription lifecycle pairs with the world's.
 */
export class AudioSystem implements GameSystem {
  readonly id = "audio";

  private readonly unsubscribe: Unsubscribe;

  constructor() {
    this.unsubscribe = gameBus.on((event) => {
      if (event.type === "spawn") playCue("spawn");
    });
  }

  update(): void {
    // Intentionally frameless: audio is event-driven.
  }

  dispose(): void {
    this.unsubscribe();
  }
}
