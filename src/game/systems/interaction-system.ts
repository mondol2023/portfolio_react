import { GestureController } from "../interactions/gesture-controller";

import type { GameSystem, SystemContext } from "./types";

/**
 * Frame-loop adapter around the gesture controller.
 *
 * All gesture logic lives in `interactions/gesture-controller.ts`; this class
 * exists so the world's system runner can order interaction deterministically
 * alongside spawn/merge/split/particles — input first, gameplay after.
 */
export class InteractionSystem implements GameSystem {
  readonly id = "interaction";

  private readonly gestures = new GestureController();

  update(context: SystemContext): void {
    this.gestures.update(context.camera, context.delta);
  }

  dispose(): void {
    this.gestures.dispose();
  }
}
