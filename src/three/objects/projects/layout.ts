/**
 * Projects' shared wall-slab layout — the part every variant needs
 * regardless of how it renders a panel: depth, lift off the eyeline, scale
 * falloff and its raked-open vs. flush-closed yaw. `corridor.tsx` is the
 * first consumer; `monoliths.tsx`, `foliage.tsx` and `plansheets.tsx`
 * (Phases G/I/J) read the same slabs rather than re-deriving a layout each.
 */

import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { seededRandom } from "@/lib/experience/random";
import type { ScenePalette } from "@/lib/experience/scene-palette";
import type { Project } from "@/lib/types/content";

export interface WallSlab {
  project: Project;
  /** -1 mounts on the left wall, +1 on the right. */
  side: 1 | -1;
  /** Depth in the corridor's own frame. Screen placement is resolved per frame. */
  z: number;
  /** Distance off the eyeline as a fraction of the viewport half-height — converges with depth. */
  lift: number;
  /** Size relative to the nearest panel. */
  scale: number;
  /** Yaw when the panel is open — angled off its wall, raking toward the camera. */
  open: number;
  /** Yaw when flush with its wall: edge-on to the camera, a lit sliver and nothing more. */
  closed: number;
  color: THREE.Color;
  metal: boolean;
}

/** Slab face, in metres-ish scene units. */
export const SLAB_WIDTH = 1.9;
export const SLAB_HEIGHT = 1.25;
export const SLAB_DEPTH = 0.08;

/** Depth of the nearest slab, and the step between successive ones. */
export const WALL_FIRST_Z = -0.6;
export const WALL_PITCH = 2.8;

/**
 * How far the near panel rides off the eyeline, and how fast that offset
 * decays with depth. This is where the corridor's vanishing point actually
 * comes from: horizontally the panels are pinned into the page's gutters,
 * so it is the *vertical* convergence toward the eyeline — together with
 * each panel being smaller, lighter and dimmer than the one in front of it —
 * that reads as receding space.
 */
export const LIFT_NEAR = 0.34;
export const LIFT_FALLOFF = 0.62;
/** Each panel is a little smaller than the one in front, on top of perspective. */
export const SCALE_FALLOFF = 0.06;
/** How much further into the fog each successive panel sits. */
export const FAR_DIM = 0.13;

/** How far off its wall an open panel rakes. Enough to catch the key light, never enough to face front. */
export const TOE_IN = THREE.MathUtils.degToRad(52);
export const FLUSH = Math.PI / 2;
/** A closed panel also sits further out, so opening reads as stepping off the wall. */
export const CLOSED_STEP = 0.3;

/** Wall panels a tier will draw. Depth, not headcount, is what makes the corridor read. */
export const WALL_LIMIT: Record<SceneBudget["tier"], number> = { low: 2, mid: 3, high: 4 };

export function buildSlabs(projects: Project[], palette: ScenePalette, limit: number): WallSlab[] {
  const random = seededRandom(41);
  const base = new THREE.Color(palette.surface);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);

  const chosen = projects.slice(0, limit);
  const span = Math.max(1, chosen.length - 1);

  return chosen.map((project, index) => {
    const side: 1 | -1 = index % 2 === 0 ? -1 : 1;
    const metal = index % 3 === 1;

    // Every panel stays inside the section's own hue: lightness and chroma
    // vary, the hue never does. The previous build hashed `project.type` into
    // an arbitrary hue offset, which turned the deck into exactly the rainbow
    // the brief rules out — and meant the section's colour identity changed
    // whenever an editor retyped a project's category.
    //
    // The lightness ramp is what gives the corridor its near-to-far read: the
    // panel nearest the camera is the darkest and most present against a
    // near-white page, and each one behind it steps lighter, meeting the fog
    // rather than fighting it.
    const color = new THREE.Color().setHSL(
      hsl.h,
      THREE.MathUtils.clamp(hsl.s * (metal ? 0.46 : 0.66), 0, 1),
      palette.dark
        ? THREE.MathUtils.lerp(0.24, 0.42, index / span)
        : THREE.MathUtils.lerp(0.31, 0.52, index / span),
    );

    return {
      project,
      side,
      z: WALL_FIRST_Z - index * WALL_PITCH,
      lift: LIFT_NEAR * Math.pow(LIFT_FALLOFF, index) + (random() - 0.5) * 0.03,
      scale: 1 - index * SCALE_FALLOFF,
      open: -side * TOE_IN,
      closed: -side * FLUSH,
      color,
      metal,
    };
  });
}
