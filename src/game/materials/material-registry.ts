import {
  AdditiveBlending,
  Color,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointsMaterial,
  type Material,
} from "three";

import { FUSION } from "../config/game-config";
import { isFusedKind, partsOf } from "../config/fusion";
import { readTonePalette, type TonePalette } from "../config/palette";
import { definitionFor } from "../config/shape-registry";

import type { BaseShapeKind, FusedShapeKind, ShapeKind } from "../types/game";

/**
 * Shared material registry — one material per species, re-tinted on theme
 * changes rather than rebuilt.
 *
 * Sharing is what keeps a dozen physics shapes cheap: identical materials let
 * three.js batch and the GPU state machine skip changes. Per-entity feedback
 * (hover glow) deliberately rides on *scale*, not material edits, so sharing
 * never has to be broken.
 */
const shapeMaterials = new Map<ShapeKind, MeshStandardMaterial>();
let fragmentMaterial: MeshBasicMaterial | null = null;
let particleMaterial: PointsMaterial | null = null;

interface ShapeTint {
  color: string;
  emissive: string;
  emissiveIntensity: number;
  roughness: number;
  metalness: number;
}

function baseTint(kind: BaseShapeKind, palette: TonePalette): ShapeTint {
  switch (kind) {
    case "cube":
      return { color: palette.toneSoft, emissive: palette.toneSoft, emissiveIntensity: 0.06, roughness: 0.55, metalness: 0.1 };
    case "crystal":
      return { color: palette.tone, emissive: palette.tone, emissiveIntensity: 0.22, roughness: 0.15, metalness: 0.2 };
    case "stone":
      return { color: palette.tone, emissive: palette.tone, emissiveIntensity: 0.1, roughness: 0.85, metalness: 0.05 };
    case "star":
      return { color: palette.accent, emissive: palette.accent, emissiveIntensity: 0.75, roughness: 0.3, metalness: 0.15 };
    case "lantern":
      return { color: palette.accent, emissive: palette.accent, emissiveIntensity: 1.1, roughness: 0.4, metalness: 0.1 };
    case "core":
      return { color: palette.accent, emissive: palette.accent, emissiveIntensity: 1.4, roughness: 0.2, metalness: 0.45 };
  }
}

// Scratch colours for the fusion blend — mixing runs once per new recipe, but
// allocating three `Color`s per part per palette change is still pointless.
const blendColor = new Color();
const blendEmissive = new Color();
const scratch = new Color();

/**
 * A composite's look, mixed from its ingredients by volume share.
 *
 * The blend is weighted the same way its physics is (`rᵢ³`), so a stone fused
 * with a small crystal still looks mostly like stone — the fusion reads as
 * *those two shapes*, not as a new species that happens to be there. Each
 * extra part then lifts the emissive a step, which is what makes a four-part
 * fusion visibly the brightest thing in the slab.
 */
function fusedTint(kind: FusedShapeKind, palette: TonePalette): ShapeTint {
  const parts = partsOf(kind);
  blendColor.setRGB(0, 0, 0);
  blendEmissive.setRGB(0, 0, 0);

  let weightTotal = 0;
  let emissiveIntensity = 0;
  let roughness = 0;
  let metalness = 0;

  for (const part of parts) {
    const look = baseTint(part, palette);
    const weight = definitionFor(part).radius ** 3;
    weightTotal += weight;

    // `Color.set` leaves the colour untouched on an unparseable input rather
    // than throwing, so a palette token three can't read degrades to a darker
    // blend instead of a blank frame.
    blendColor.add(scratch.set(look.color).multiplyScalar(weight));
    blendEmissive.add(scratch.set(look.emissive).multiplyScalar(weight));
    emissiveIntensity += look.emissiveIntensity * weight;
    roughness += look.roughness * weight;
    metalness += look.metalness * weight;
  }

  if (weightTotal <= 0) return baseTint("cube", palette);

  const inverse = 1 / weightTotal;
  blendColor.multiplyScalar(inverse);
  blendEmissive.multiplyScalar(inverse);

  return {
    color: `#${blendColor.getHexString()}`,
    emissive: `#${blendEmissive.getHexString()}`,
    emissiveIntensity: emissiveIntensity * inverse * (1 + (parts.length - 1) * FUSION.emissiveStep),
    roughness: roughness * inverse,
    metalness: metalness * inverse,
  };
}

function tint(kind: ShapeKind, palette: TonePalette): ShapeTint {
  return isFusedKind(kind) ? fusedTint(kind, palette) : baseTint(kind, palette);
}

/** A species' resting emissive intensity under the live palette — the floor a merge flash decays back to. */
export function getBaseEmissiveIntensity(kind: ShapeKind): number {
  return tint(kind, readTonePalette()).emissiveIntensity;
}

export function getShapeMaterial(kind: ShapeKind): MeshStandardMaterial {
  let material = shapeMaterials.get(kind);
  if (!material) {
    const look = tint(kind, readTonePalette());
    material = new MeshStandardMaterial({
      color: new Color(look.color),
      emissive: new Color(look.emissive),
      emissiveIntensity: look.emissiveIntensity,
      roughness: look.roughness,
      metalness: look.metalness,
      transparent: true,
      opacity: 0.92,
    });
    shapeMaterials.set(kind, material);
  }
  return material;
}

/** Fragments: flat, translucent, slightly additive — they are echoes, not objects. */
export function getFragmentMaterial(): MeshBasicMaterial {
  if (!fragmentMaterial) {
    fragmentMaterial = new MeshBasicMaterial({
      color: new Color(readTonePalette().toneSoft),
      transparent: true,
      opacity: 0.55,
      blending: AdditiveBlending,
      depthWrite: false,
    });
  }
  return fragmentMaterial;
}

/** The pooled particle field's points material (additive, unfogged). */
export function getParticleMaterial(): PointsMaterial {
  if (!particleMaterial) {
    particleMaterial = new PointsMaterial({
      size: 0.09,
      vertexColors: true,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
  }
  return particleMaterial;
}

/**
 * One fresh additive ring material per impact — unlike every other registry
 * entry here, this one is deliberately *not* shared: each ring fades its own
 * opacity on its own clock, so a shared instance would make every live ring
 * flash to whichever one last wrote the opacity. The pool is tiny
 * (`IMPACT_RINGS.pool`) and each material lives under half a second, so the
 * allocation is negligible — the caller disposes it when the ring expires.
 */
export function createImpactRingMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color: new Color(readTonePalette().accent),
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
  });
}

/**
 * Re-reads the palette and re-tints every live material in place — called on
 * theme/section tone changes. Materials are mutated, never replaced, so
 * nothing holding a reference is invalidated.
 */
export function refreshMaterials(): void {
  const palette = readTonePalette();
  for (const [kind, material] of shapeMaterials) {
    const look = tint(kind, palette);
    material.color.set(look.color);
    material.emissive.set(look.emissive);
    material.emissiveIntensity = look.emissiveIntensity;
  }
  fragmentMaterial?.color.set(palette.toneSoft);
}

/** Frees every cached material — module teardown only. */
export function disposeMaterials(): void {
  for (const material of shapeMaterials.values()) material.dispose();
  shapeMaterials.clear();
  fragmentMaterial?.dispose();
  fragmentMaterial = null;
  particleMaterial?.dispose();
  particleMaterial = null;
}

/** Everything in the registry is a `Material` — handy for exhaustive cleanup. */
export type AnyRegisteredMaterial = Material;
