import type { BufferGeometry } from "three";

/**
 * Hand-off between the particle field's GPU buffers and the particle system.
 *
 * The field owns the `BufferGeometry` (React lifecycle); the system writes
 * the backing arrays and flips the update flags here each frame. A module
 * slot keeps the two decoupled without a context — the world is single-
 * instance, and the slot is nulled on unmount.
 */
let slot: BufferGeometry | null = null;

export function publishParticleGeometry(geometry: BufferGeometry | null): void {
  slot = geometry;
}

export function withParticleGeometry(update: (geometry: BufferGeometry) => void): void {
  if (slot) update(slot);
}
