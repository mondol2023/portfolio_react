import { createEventBus, type EventBus } from "../utils/event-bus";

import type { GameEvent } from "../types/game";

/**
 * The world's single event channel.
 *
 * Systems publish; the score, audio and particle systems subscribe, as does the
 * host adapter mounted through `GameProvider`'s `onEvent`. A singleton keeps
 * stores and systems decoupled without threading context through the tree, and
 * it lives outside React so emissions from inside `useFrame` never touch
 * component state.
 */
export const gameBus: EventBus<GameEvent> = createEventBus<GameEvent>();

/** Convenience emitter so call sites read as a sentence: `emitGame({ type: "merge", ... })`. */
export function emitGame(event: GameEvent): void {
  gameBus.emit(event);
}
