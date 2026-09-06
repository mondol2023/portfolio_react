import { PARTICLES } from "../config/game-config";
import { readTonePalette } from "../config/palette";
import { withParticleGeometry } from "../particles/buffer-bridge";
import { useParticleStore } from "../stores/particle-store";

import type { BurstKind } from "../stores/particle-store";
import type { GameSystem, SystemContext } from "./types";
import type { ParticleSimulation } from "../particles/simulation";

/** Burst palette per kind — read live so theme switches re-tint bursts. */
function colorFor(kind: BurstKind): [number, number, number] {
  const palette = readTonePalette();
  switch (kind) {
    case "merge":
      return hexToRgb(palette.accent);
    case "collect":
      return [1, 0.84, 0.35]; // warm gold — the reward colour, theme-independent
    case "spawn":
      return hexToRgb(palette.toneSoft);
    case "split":
    default:
      return hexToRgb(palette.tone);
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.startsWith("#") ? hex.slice(1) : hex;
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const int = Number.parseInt(full, 16);
  if (Number.isNaN(int)) return [1, 1, 1];
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
}

/** Base particle count per burst kind, scaled by the burst's strength. */
const BURST_COUNTS: Record<BurstKind, number> = {
  merge: PARTICLES.mergeBurst,
  split: PARTICLES.splitBurst,
  collect: PARTICLES.collectBurst,
  spawn: 10,
};

/**
 * Drains burst requests into the pooled simulation and integrates it.
 *
 * Consumers enqueue into the particle store from anywhere (systems, UI);
 * this system is the only writer of the buffers, once per frame.
 */
export class ParticleSystem implements GameSystem {
  readonly id = "particles";

  constructor(private readonly simulation: ParticleSimulation) {}

  update({ delta }: SystemContext): void {
    const store = useParticleStore.getState();

    for (const request of store.drain()) {
      const base = BURST_COUNTS[request.kind];
      const count = Math.round(base * request.strength);
      this.simulation.spawnBurst(request.position, count, colorFor(request.kind), request.strength);
    }

    this.simulation.step(delta);

    // Upload what the simulation just wrote: positions/colors moved, and the
    // draw range tracks the live compaction.
    withParticleGeometry((geometry) => {
      geometry.setDrawRange(0, this.simulation.alive);
      geometry.getAttribute("position").needsUpdate = true;
      geometry.getAttribute("color").needsUpdate = true;
    });

    store.setActiveCount(this.simulation.alive);
  }
}
