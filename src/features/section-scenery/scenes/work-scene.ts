import { scaleCount, type SceneDensity } from "../engine/density";
import { composeScene, type Scene } from "../engine/scene";
import { glowDisc } from "../primitives/glow-disc";
import { perspectiveRails } from "../primitives/perspective-rails";

/**
 * Work — an arrival.
 *
 * The only scene with depth, and the only one whose speed changes over its own
 * lifetime: markers stream in fast and decelerate to an idle over the first
 * second and a bit, so reaching the projects feels like pulling up somewhere
 * rather than scrolling past more background.
 *
 * It is also the only scene where the reader moves the *camera*. The vanishing
 * point drifts toward the pointer and the whole projection turns with it, and
 * scrolling accelerates the markers — so reading down through the cards keeps
 * the arrival going instead of letting it settle.
 */
export function workScene(density: SceneDensity): Scene {
  return composeScene(
    glowDisc({ x: 0.5, y: 0.44, radius: 0.4, alpha: 0.45, breathe: 0.05, period: 10, follow: 0.05 }),
    perspectiveRails({
      vanishX: 0.5,
      vanishY: 0.44,
      rails: scaleCount(9, density),
      markers: scaleCount(28, density),
      idleSpeed: 0.5,
      arrivalSpeed: 6,
      look: 0.05,
      scrollBoost: 3,
    }),
  );
}
