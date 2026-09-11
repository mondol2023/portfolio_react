import { scaleCount, type SceneDensity } from "../engine/density";
import { composeScene, type Scene } from "../engine/scene";
import { driftParticles } from "../primitives/drift-particles";
import { glowDisc } from "../primitives/glow-disc";

/**
 * Contact — points that rush in and settle.
 *
 * The last section should come to rest. The fireflies arrive with real speed and
 * the damping brings them almost to a stop within a couple of seconds, leaving a
 * still, breathing field under a high moon. It is the quietest scene on the site
 * by design: the reader has arrived at the form and nothing should pull at them.
 *
 * Which is exactly why its interaction is the gentlest one in the set, and the
 * only one that is an invitation: fireflies drift toward the pointer, brighten,
 * and settle again when it moves on. The moon barely follows at all — it is the
 * one fixed thing on a page where the reader is being asked to stop.
 */
export function contactScene(density: SceneDensity): Scene {
  return composeScene(
    glowDisc({
      x: 0.5,
      y: 0.24,
      radius: 0.5,
      alpha: 0.42,
      breathe: 0.05,
      period: 12,
      rise: 0.22,
      follow: 0.015,
    }),
    driftParticles({
      count: scaleCount(52, density),
      speedX: 120,
      speedY: 120,
      damping: 0.06,
      radius: 2,
      twinkle: 0.8,
      attraction: 70,
      attractionRadius: 0.28,
    }),
  );
}
