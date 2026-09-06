import { PARTICLES } from "../config/game-config";

import type { Vec3 } from "../types/game";

/**
 * CPU particle simulation behind the world's bursts.
 *
 * A single pooled buffer: positions and colors live in flat `Float32Array`s
 * that a `THREE.Points` renders directly, so spawning a burst is arithmetic
 * and a frame with a thousand particles is one buffer upload. Fading is done
 * by darkening color (the material is additive — black is invisible), which
 * needs no shader and no per-particle alpha attribute.
 *
 * Swap-remove keeps the alive compaction O(1) per death.
 */
export interface ParticleSimulation {
  readonly capacity: number;
  readonly alive: number;
  /** XYZ triples, straight into the geometry's position attribute. */
  readonly positions: Float32Array;
  /** RGB triples, straight into the geometry's color attribute. */
  readonly colors: Float32Array;
  spawnBurst(origin: Vec3, count: number, color: readonly [number, number, number], strength: number): void;
  step(deltaSeconds: number): void;
  reset(): void;
}

/** Strict-mode helper: flat-array reads are `T | undefined` under `noUncheckedIndexedAccess`. */
function at(array: Float32Array, index: number): number {
  return array[index] ?? 0;
}

export function createParticleSimulation(capacity: number): ParticleSimulation {
  const max = Math.max(64, capacity);
  const positions = new Float32Array(max * 3);
  const colors = new Float32Array(max * 3);
  const velocities = new Float32Array(max * 3);
  const ages = new Float32Array(max);
  const lifetimes = new Float32Array(max);
  const baseRed = new Float32Array(max);
  const baseGreen = new Float32Array(max);
  const baseBlue = new Float32Array(max);

  let alive = 0;

  return {
    capacity: max,
    get alive() {
      return alive;
    },
    positions,
    colors,

    spawnBurst(origin, count, color, strength) {
      const budget = max - alive;
      const total = Math.min(count, budget);

      for (let i = 0; i < total; i += 1) {
        const index = alive;
        alive += 1;

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed = PARTICLES.speedMin + Math.random() * (PARTICLES.speedMax - PARTICLES.speedMin) * strength;

        const i3 = index * 3;
        positions[i3] = origin[0];
        positions[i3 + 1] = origin[1];
        positions[i3 + 2] = origin[2];

        velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed;
        velocities[i3 + 1] = Math.cos(phi) * speed;
        velocities[i3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

        baseRed[index] = color[0];
        baseGreen[index] = color[1];
        baseBlue[index] = color[2];
        colors[i3] = color[0];
        colors[i3 + 1] = color[1];
        colors[i3 + 2] = color[2];

        ages[index] = 0;
        lifetimes[index] = (PARTICLES.lifetimeMs / 1000) * (0.6 + Math.random() * 0.4);
      }
    },

    step(deltaSeconds) {
      let index = 0;
      while (index < alive) {
        const age = at(ages, index) + deltaSeconds;
        const lifetime = at(lifetimes, index);

        if (age >= lifetime) {
          // Swap with the last alive particle and shrink the population.
          const last = alive - 1;
          if (index !== last) copyParticle(index, last);
          alive -= 1;
          continue;
        }

        ages[index] = age;

        const i3 = index * 3;
        const vy = at(velocities, i3 + 1) + PARTICLES.gravity * deltaSeconds;
        velocities[i3 + 1] = vy;

        positions[i3] = at(positions, i3) + at(velocities, i3) * deltaSeconds;
        positions[i3 + 1] = at(positions, i3 + 1) + vy * deltaSeconds;
        positions[i3 + 2] = at(positions, i3 + 2) + at(velocities, i3 + 2) * deltaSeconds;

        // Additive fade: dim toward black as the particle ages.
        const fade = 1 - age / lifetime;
        colors[i3] = at(baseRed, index) * fade;
        colors[i3 + 1] = at(baseGreen, index) * fade;
        colors[i3 + 2] = at(baseBlue, index) * fade;

        index += 1;
      }
    },

    reset() {
      alive = 0;
    },
  };

  function copyParticle(target: number, source: number): void {
    for (let c = 0; c < 3; c += 1) {
      const t = target * 3 + c;
      const s = source * 3 + c;
      positions[t] = at(positions, s);
      colors[t] = at(colors, s);
      velocities[t] = at(velocities, s);
    }
    ages[target] = at(ages, source);
    lifetimes[target] = at(lifetimes, source);
    baseRed[target] = at(baseRed, source);
    baseGreen[target] = at(baseGreen, source);
    baseBlue[target] = at(baseBlue, source);
  }
}
