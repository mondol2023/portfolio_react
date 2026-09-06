import { SCORE_RULES } from "../config/game-config";
import { definitionFor } from "../config/shape-registry";
import { cueForReason, useScoreStore, type ScoreReason } from "../stores/score-store";
import { emitGame, gameBus } from "../events/game-bus";
import { playCue } from "../audio/audio-controller";
import { requestImpact } from "./impact-system";
import { useParticleStore } from "../stores/particle-store";

import type { GameSystem, SystemContext } from "./types";
import type { Unsubscribe } from "../utils/event-bus";
import type { Vec3 } from "../types/game";

/**
 * The world's economy.
 *
 * Subscribes to the scoring events (merge/split/collect), converts them into
 * points through the score store — applying and heating the combo multiplier —
 * and re-broadcasts a single `score` event so the HUD chip stays one
 * subscriber away from the raw gameplay. The multiplier decays on a cadence
 * while the visitor is idle, which is the only reason this is a system and
 * not a bare subscriber.
 */
export class ScoreSystem implements GameSystem {
  readonly id = "score";

  private readonly unsubscribers: Unsubscribe[];
  private lastScoreAt = 0;
  private lastDecayAt = 0;

  constructor() {
    this.unsubscribers = [
      gameBus.on((event) => {
        if (event.type === "merge") this.award("merge", definitionFor(event.kind).value, event.position);
        if (event.type === "split") this.award("split", Math.ceil(definitionFor(event.kind).value / 2), event.position);
        if (event.type === "collect") this.award("collect", event.points, event.position);
      }),
    ];
  }

  update({ now }: SystemContext): void {
    if (this.lastScoreAt === 0) return;
    const cold = now - this.lastScoreAt >= SCORE_RULES.multiplierDecayDelayMs;
    if (!cold) return;
    if (now - this.lastDecayAt < SCORE_RULES.multiplierDecayIntervalMs) return;

    this.lastDecayAt = now;
    const store = useScoreStore.getState();
    if (store.multiplier > 1) store.cool();
  }

  private award(reason: ScoreReason, base: number, position: Vec3): void {
    const store = useScoreStore.getState();
    const gained = store.addPoints(base, reason);
    store.heat();
    this.lastScoreAt = performance.now();

    useParticleStore.getState().enqueue({
      kind: reason,
      position: [position[0], position[1], position[2]],
      strength: 1,
    });
    requestImpact(reason, position, this.lastScoreAt);
    playCue(cueForReason(reason));
    emitGame({ type: "score", total: useScoreStore.getState().points, delta: gained });
  }

  dispose(): void {
    for (const unsubscribe of this.unsubscribers) unsubscribe();
  }
}
