/**
 * Skills' shared node layout — the part every variant needs regardless of how
 * it renders a node: where it starts, where it settles, which category it
 * belongs to, and which two nodes are its nearest neighbours in the settled
 * layout. `constellation.tsx` is the first consumer; `orrery.tsx`,
 * `growth.tsx` and `schematic.tsx` (Phases I/J/G) read the same nodes rather
 * than re-deriving a layout each.
 */

import * as THREE from "three";

import { seededRandom } from "@/lib/experience/random";
import { SKILL_CATEGORIES, type Skill } from "@/lib/types/content";

import { arcSlotPosition } from "../../scene/geometry";

export interface GalaxyNode {
  skill: Skill;
  scattered: THREE.Vector3;
  target: THREE.Vector3;
  color: THREE.Color;
  metal: boolean;
  /** The two nearest nodes in the settled layout — they lean in when this one is hovered. */
  neighbours: number[];
  /** Offsets this node's idle bob so the field breathes out of step. */
  phase: number;
}

export const NODE_RADIUS = 0.11;
/** Loose per-category cluster centres arranged around a ring, so the graph reads as distinct constellations rather than one blob. */
export const CLUSTER_RADIUS = 1.7;

/**
 * @param hueSpread `scenery.hueSpread` — how far category coding may rotate a
 *   node's hue from the scenery accent, as a fraction of the wheel. `0` keeps
 *   every node one ink (blueprint); category then reads as lightness alone.
 */
export function buildNodes(skills: Skill[], maxNodes: number, tone: string, hueSpread: number): GalaxyNode[] {
  const random = seededRandom(29);
  const ranked = skills
    .filter((skill) => skill.enabled)
    .sort((a, b) => a.order - b.order)
    .slice(0, maxNodes);

  const baseHsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(tone).getHSL(baseHsl);

  const clusterCenters = new Map<string, THREE.Vector3>();
  SKILL_CATEGORIES.forEach((category, index) => {
    const angle = (index / SKILL_CATEGORIES.length) * Math.PI * 2;
    clusterCenters.set(
      category,
      new THREE.Vector3(Math.cos(angle) * CLUSTER_RADIUS, Math.sin(angle) * 0.9, -0.4 + Math.sin(angle * 2) * 0.3),
    );
  });

  const nodes: GalaxyNode[] = ranked.map((skill, index) => {
    // Starts exactly where About's fragments settle — the same arc, read by
    // this node's own position instead of an unrelated scatter cloud.
    const arcT = ranked.length === 1 ? 0 : index / (ranked.length - 1) - 0.5;
    const scattered = arcSlotPosition(arcT);
    scattered.x += (random() - 0.5) * 0.15;
    scattered.y += (random() - 0.5) * 0.15;
    scattered.z += (random() - 0.5) * 0.2;

    const center = clusterCenters.get(skill.category) ?? new THREE.Vector3();
    const target = center
      .clone()
      .add(new THREE.Vector3((random() - 0.5) * 0.9, (random() - 0.5) * 0.7, (random() - 0.5) * 0.6));

    // Category coding, centred on the scenery's own accent rather than
    // sweeping the wheel from it. `spread` runs -0.5..0.5 so the band sits
    // symmetrically around the accent instead of drifting off one side, and
    // the lightness ladder keeps categories separable even at `hueSpread: 0`.
    const categoryIndex = Math.max(0, SKILL_CATEGORIES.indexOf(skill.category));
    const spread = SKILL_CATEGORIES.length > 1 ? categoryIndex / (SKILL_CATEGORIES.length - 1) - 0.5 : 0;
    const hue = (baseHsl.h + spread * hueSpread + 1) % 1;
    const color = new THREE.Color().setHSL(hue, Math.max(baseHsl.s, 0.45), 0.6 + spread * 0.2);

    return {
      skill,
      scattered,
      target,
      color,
      metal: index % 2 === 1,
      neighbours: [],
      phase: random() * Math.PI * 2,
    };
  });

  // Proximity in the *settled* layout, not in the graph: the reaction should
  // travel to whatever is visibly beside the node, which is rarely the node
  // its category chain happens to link it to.
  nodes.forEach((node, index) => {
    node.neighbours = nodes
      .map((other, otherIndex) => ({ otherIndex, distance: node.target.distanceToSquared(other.target) }))
      .filter((entry) => entry.otherIndex !== index)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2)
      .map((entry) => entry.otherIndex);
  });

  return nodes;
}

export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
