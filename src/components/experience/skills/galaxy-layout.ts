import { seededRandom } from "@/lib/experience/random";
import {
  SKILL_CATEGORIES,
  type ProficiencyLevel,
  type Skill,
  type SkillCategory,
} from "@/lib/types/content";

/**
 * Turns the admin's flat list of skills into a solar system.
 *
 * Kept as plain functions, away from React and away from Three: the arrangement
 * of the galaxy is a content decision — which category sits on which orbit, how
 * big a "daily driver" looks next to something being learned — and it should be
 * testable and readable without a canvas. The scene consumes the result and
 * decides nothing about it.
 *
 * Two rules the layout obeys:
 *
 * 1. **The budget decides the size.** A weak device gets fewer planets, not a
 *    different system — so culling drops nodes round-robin across categories
 *    rather than truncating the list, and every category that has a skill keeps
 *    at least one visible.
 * 2. **Nothing is lost.** Whatever the budget could not place comes back as
 *    `hidden`, and the section still lists it in the DOM. A visitor on an old
 *    phone reads the same stack; they just orbit less of it.
 */

export interface GalaxyOrbit {
  category: SkillCategory;
  /** Distance from the centre of the system. */
  radius: number;
  /** Rotation of the orbital plane on X, so the rings are not all coplanar. */
  tilt: number;
  count: number;
}

export interface GalaxyNode {
  id: string;
  name: string;
  category: SkillCategory;
  radius: number;
  tilt: number;
  /** Starting position around the ring, in radians. */
  angle: number;
  /** Drift above or below the orbital plane, so the ring has thickness. */
  height: number;
  size: number;
  /** Radians per second. Inner planets travel faster, as they should. */
  speed: number;
}

export interface GalaxyLayout {
  orbits: GalaxyOrbit[];
  nodes: GalaxyNode[];
  /** Skills the budget could not afford to place. Still listed in the DOM. */
  hidden: Skill[];
  /** Radius of the outermost orbit — what the camera has to frame. */
  extent: number;
}

/** Planet radius by proficiency. A daily driver is visibly a bigger world. */
const SIZE: Record<ProficiencyLevel, number> = {
  expert: 0.34,
  proficient: 0.28,
  working: 0.23,
  learning: 0.18,
};

/** Skills with no proficiency recorded sit mid-table rather than at the bottom. */
const DEFAULT_SIZE = 0.25;

/** Culling order: the strongest skill in each category survives longest. */
const RANK: Record<ProficiencyLevel, number> = {
  expert: 3,
  proficient: 2,
  working: 1,
  learning: 0,
};

const DEFAULT_RANK = 1.5;

const FIRST_ORBIT = 2.5;
const ORBIT_STEP = 1.3;
/** Total spread of the orbital planes, in radians, shared across the orbits. */
const TILT_SPREAD = 0.42;
/** How far a planet may wander from its evenly-spaced slot on the ring. */
const ANGLE_JITTER = 0.55;
const BASE_SPEED = 0.34;

function rank(skill: Skill): number {
  return skill.proficiency ? RANK[skill.proficiency] : DEFAULT_RANK;
}

function size(skill: Skill): number {
  return skill.proficiency ? SIZE[skill.proficiency] : DEFAULT_SIZE;
}

/** Stable per-category seed, so a rebuild never reshuffles the sky. */
function seedFor(category: string): number {
  let seed = 0x9e37;
  for (let index = 0; index < category.length; index += 1) {
    seed = (seed * 31 + category.charCodeAt(index)) >>> 0;
  }
  return seed;
}

/**
 * Drops skills the budget cannot afford, one pass at a time across categories.
 *
 * Taking the first N of a sorted list would hand every planet to whichever
 * category the owner happened to fill in most, and leave three orbits empty.
 * Round-robin keeps the system looking like a system.
 */
function withinBudget(skills: readonly Skill[], maxNodes: number): {
  kept: Skill[];
  hidden: Skill[];
} {
  if (skills.length <= maxNodes) return { kept: [...skills], hidden: [] };

  const queues = new Map<SkillCategory, Skill[]>();
  for (const skill of skills) {
    const queue = queues.get(skill.category);
    if (queue) queue.push(skill);
    else queues.set(skill.category, [skill]);
  }

  for (const queue of queues.values()) {
    queue.sort((a, b) => rank(b) - rank(a) || a.order - b.order);
  }

  const kept: Skill[] = [];
  const lists = [...queues.values()];

  for (let round = 0; kept.length < maxNodes; round += 1) {
    let placed = false;

    for (const list of lists) {
      const skill = list[round];
      if (!skill) continue;
      kept.push(skill);
      placed = true;
      if (kept.length === maxNodes) break;
    }

    // Every queue is exhausted — impossible given the length check above, but a
    // guard is cheaper than an infinite loop if that check ever changes.
    if (!placed) break;
  }

  const keptIds = new Set(kept.map((skill) => skill.id));
  return { kept, hidden: skills.filter((skill) => !keptIds.has(skill.id)) };
}

export function buildGalaxy(skills: readonly Skill[], maxNodes: number): GalaxyLayout {
  const { kept, hidden } = withinBudget(skills, Math.max(1, maxNodes));

  // Category order comes from the type, not from insertion order, so the orbits
  // read the same way the admin panel lists them.
  const categories = SKILL_CATEGORIES.filter((category) =>
    kept.some((skill) => skill.category === category),
  );

  const orbits: GalaxyOrbit[] = [];
  const nodes: GalaxyNode[] = [];
  const centre = (categories.length - 1) / 2;

  categories.forEach((category, index) => {
    const members = kept
      .filter((skill) => skill.category === category)
      .sort((a, b) => a.order - b.order);

    const radius = FIRST_ORBIT + index * ORBIT_STEP;
    const tilt = categories.length > 1 ? ((index - centre) / centre) * TILT_SPREAD : 0;
    const random = seededRandom(seedFor(category));

    orbits.push({ category, radius, tilt, count: members.length });

    members.forEach((skill, position) => {
      const slot = (position / members.length) * Math.PI * 2;

      nodes.push({
        id: skill.id,
        name: skill.name,
        category,
        radius,
        tilt,
        angle: slot + (random() - 0.5) * ANGLE_JITTER,
        height: (random() - 0.5) * 0.6,
        size: size(skill),
        // Kepler's third law, roughly: the far orbits crawl. Sharing one speed
        // would make the whole thing turn like a printed disc.
        speed: BASE_SPEED / Math.sqrt(radius),
      });
    });
  });

  const extent = orbits.length > 0 ? FIRST_ORBIT + (orbits.length - 1) * ORBIT_STEP : FIRST_ORBIT;

  return { orbits, nodes, hidden, extent };
}
