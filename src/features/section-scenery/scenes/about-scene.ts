import { scaleCount, type SceneDensity } from "../engine/density";
import { composeScene, type Scene } from "../engine/scene";
import { glowDisc } from "../primitives/glow-disc";
import { stalkField } from "../primitives/stalk-field";

/**
 * About — a field growing up out of the fold.
 *
 * Vertical where the hero was horizontal, so scrolling from one to the other is
 * a change of direction rather than a change of colour. The `bias` below 1 packs
 * the stalks toward the right edge, away from the prose column.
 *
 * This is the most tactile section on the site: the stalks part around the
 * pointer and spring back behind it. The reach is a little under a quarter of
 * the viewport, so the reader finds the effect by moving through the field
 * rather than being told about it.
 */
export function aboutScene(density: SceneDensity): Scene {
  return composeScene(
    glowDisc({ x: 0.78, y: 0.68, radius: 0.46, alpha: 0.4, breathe: 0.07, period: 13 }),
    stalkField({
      count: scaleCount(36, density),
      bias: 0.65,
      reach: 0.58,
      sway: 24,
      speed: 0.45,
      reachRadius: 0.22,
      push: 38,
    }),
  );
}
