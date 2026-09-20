/**
 * Scenery definitions — data, not branches (S3 of `SCENERY_SYSTEM_PLAN.md`).
 *
 * No `three` import, matching `scene-palette.ts`: `scene-root.tsx` is not
 * code-split, so anything it can reach must stay out of the first-load
 * bundle. Object files read a definition; they never `switch` on an id.
 *
 * Phase A settles this shape and ships `atelier` alone — every later phase
 * (E, G, I, J) fills the same `SceneryDefinition` rather than inventing one.
 */

import type { ScenerySkin } from "./scene-palette";

export const SCENERY_IDS = ["atelier", "observatory", "garden", "blueprint"] as const;

export type SceneryId = (typeof SCENERY_IDS)[number];

export type ToneMappingId = "aces" | "agx" | "neutral" | "none";
export type MaterialFamilyId = "standard" | "physical-translucent" | "unlit";
export type GeometryVocabularyId = "platonic" | "orrery" | "organic" | "drafting";
export type SkillsVariantId = "constellation" | "orrery" | "growth" | "schematic";
export type ProjectsVariantId = "corridor" | "monoliths" | "foliage" | "plansheets";

/** One intensity per page theme — `lighting.tsx` picks by `palette.dark`. */
export interface ThemedIntensity {
  light: number;
  dark: number;
}

/**
 * Intensities only. Colour always comes from `buildScenePalette` (S4) — a
 * scenery post-processes the palette, it never hardcodes a hex here.
 */
export interface SceneryLightRig {
  ambient: ThemedIntensity;
  /** Sky = `palette.wash`, ground = `palette.deep` (§4.1) — colour, not stored here. */
  hemisphere: { intensity: number } | null;
  key: ThemedIntensity;
  fill: ThemedIntensity;
  rim: ThemedIntensity;
  point: ThemedIntensity;
  /** Phase I: the key orbits at this rate (rad/s) instead of sitting still. `null` keeps it static. */
  keyOrbit: { speed: number } | null;
  /** Phase I: a cone on the hero sculpture. `null` omits the light entirely. */
  spot: ThemedIntensity | null;
}

export interface SceneryDefinition {
  id: SceneryId;
  name: string;
  /** Shown under the name in the picker popover (§3). */
  description: string;
  toneMapping: ToneMappingId;
  exposure: number;
  materials: MaterialFamilyId;
  geometry: GeometryVocabularyId;
  /** Multiplies the shared `sceneTime` tick rate (S6) — 1.0 is real-time. */
  timescale: number;
  /** Scales `SceneBudget.particles`; never raises it above the tier ceiling (S11). */
  particleScale: number;
  /** No shadow map at any tier — `SceneBudget.shadows` is tier-only and can't express this. */
  shadowsDisabled?: boolean;
  lights: SceneryLightRig;
  skillsVariant: SkillsVariantId;
  projectsVariant: ProjectsVariantId;
  /** Post-processes `buildScenePalette`'s output (S4) — colour override, not a new derivation. */
  skin?: ScenerySkin;
}

const ATELIER: SceneryDefinition = {
  id: "atelier",
  name: "Atelier",
  description: "The studio: warm paper, matte ceramic, one warm key. The site as it's always looked.",
  toneMapping: "aces",
  exposure: 1.0,
  materials: "standard",
  geometry: "platonic",
  timescale: 1.0,
  particleScale: 1.0,
  // Phase E: the rig `lighting.tsx` hardcoded as `dark ? a : b` ternaries is
  // now data. Ambient is cut by a third from its old-single-source values
  // (0.22/0.58) because the new hemisphere light below replaces that third
  // (§4.1) — everything else is copied verbatim from the old rig.
  lights: {
    ambient: { light: 0.39, dark: 0.15 },
    hemisphere: { intensity: 0.25 },
    key: { light: 1.6, dark: 1.3 },
    fill: { light: 0.3, dark: 0.32 },
    rim: { light: 0.64, dark: 0.9 },
    point: { light: 0.45, dark: 0.75 },
    keyOrbit: null,
    spot: null,
  },
  skillsVariant: "constellation",
  projectsVariant: "corridor",
};

/**
 * Phase G: the cheapest scenery — no binaries, no external loaders, no
 * shading. Unlit `EdgesGeometry` drafting lines on paper, read entirely
 * through material family (§4.4), tone mapping, and near-zero lighting
 * rather than a relit version of the standard rig.
 */
const BLUEPRINT: SceneryDefinition = {
  id: "blueprint",
  name: "Blueprint",
  description: "The drafting table: cyan schematic lines on paper, no shading, no shadows.",
  toneMapping: "none",
  exposure: 1.0,
  materials: "unlit",
  geometry: "drafting",
  timescale: 1.25,
  particleScale: 0.4,
  shadowsDisabled: true,
  lights: {
    // Flat and near-shadeless by design — unlit geometry draws its own lines
    // regardless, so the rig only needs to keep the shared objects visible.
    ambient: { light: 0.9, dark: 0.85 },
    hemisphere: { intensity: 0.3 },
    key: { light: 0.05, dark: 0.05 },
    fill: { light: 0, dark: 0 },
    rim: { light: 0, dark: 0 },
    point: { light: 0, dark: 0 },
    keyOrbit: null,
    spot: null,
  },
  skillsVariant: "schematic",
  projectsVariant: "plansheets",
  skin: { lineColor: "#3fb8ff" },
};

/**
 * Phase I: night, polished metal, one moving light. The key no longer sits
 * still — `keyOrbit` (§4.2, S6) turns it into the scene's first animated
 * light — and a spot picks out the hero sculpture. Ambient stays low in both
 * page themes on purpose: this is a night scenery, not a relit day one.
 */
const OBSERVATORY: SceneryDefinition = {
  id: "observatory",
  name: "Observatory",
  description: "Night: polished metal and glass under a cold sky, one moving light.",
  toneMapping: "agx",
  exposure: 1.15,
  materials: "standard",
  geometry: "orrery",
  timescale: 0.75,
  particleScale: 1,
  lights: {
    ambient: { light: 0.1, dark: 0.08 },
    hemisphere: { intensity: 0.5 },
    key: { light: 1.4, dark: 1.5 },
    fill: { light: 0.16, dark: 0.18 },
    rim: { light: 0.45, dark: 0.5 },
    point: { light: 0.35, dark: 0.4 },
    keyOrbit: { speed: 0.06 },
    spot: { light: 1.1, dark: 1.2 },
  },
  skillsVariant: "orrery",
  projectsVariant: "monoliths",
  // Hue → cold, chroma up, surface forced dark regardless of page theme (§4.2).
  skin: { hueTowardDeg: 210, hueBlend: 0.6, chromaScale: 1.15, surfaceLightness: 0.22 },
};

/**
 * Phase J: a terrarium at rest. Soft green bounce off a hemisphere light
 * (sky/ground, §4.1) carries most of the read; the one directional key stays
 * weak on purpose — this is diffuse daylight through glass, not a modelled
 * sun. No `keyOrbit`, no `spot`: unlike Observatory, nothing in this scenery
 * moves on its own clock, only in response to scroll.
 */
const GARDEN: SceneryDefinition = {
  id: "garden",
  name: "Garden",
  description: "A terrarium at rest: soft green light, one growing vine, leaves on the wall.",
  toneMapping: "neutral",
  exposure: 1.0,
  materials: "physical-translucent",
  geometry: "organic",
  timescale: 0.6,
  particleScale: 0.7,
  lights: {
    ambient: { light: 0.32, dark: 0.16 },
    hemisphere: { intensity: 1.1 },
    key: { light: 0.45, dark: 0.4 },
    fill: { light: 0.22, dark: 0.2 },
    rim: { light: 0.2, dark: 0.28 },
    point: { light: 0.15, dark: 0.2 },
    keyOrbit: null,
    spot: null,
  },
  skillsVariant: "growth",
  projectsVariant: "foliage",
  // Hue nudged toward leaf green, surface warmed slightly (§4.3) — chroma
  // pulled back a touch so the terrarium reads as calm, not saturated.
  skin: { hueTowardDeg: 140, hueBlend: 0.5, chromaScale: 0.9, surfaceLightness: 0.34 },
};

export const SCENERIES: Partial<Record<SceneryId, SceneryDefinition>> = {
  atelier: ATELIER,
  blueprint: BLUEPRINT,
  observatory: OBSERVATORY,
  garden: GARDEN,
};

/** Falls back to `atelier` for any id not yet defined. */
export function getSceneryDefinition(id: SceneryId): SceneryDefinition {
  return SCENERIES[id] ?? ATELIER;
}

/** Ids with an actual definition, in `SCENERY_IDS` order — what the picker renders. */
export function getAvailableSceneryIds(): readonly SceneryId[] {
  return SCENERY_IDS.filter((id) => id in SCENERIES);
}
