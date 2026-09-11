import { scaleCount, type SceneDensity } from "../engine/density";
import { composeScene, type Scene } from "../engine/scene";
import { driftParticles } from "../primitives/drift-particles";
import { stitchedPath } from "../primitives/stitched-path";

/**
 * Experience — threads written left to right, under slow weather.
 *
 * The only scene that has an order to it. Each row draws itself, staggered, and
 * then the stitches keep travelling along the finished line; the drift behind is
 * kept faint so it reads as atmosphere and not as a second subject.
 *
 * Two different responses to the same reader, which is the point of pairing
 * these particular primitives: the nearest thread is plucked toward the pointer
 * and settles back, while the rain merely leans with it. One is being touched,
 * the other is only weather.
 */
export function experienceScene(density: SceneDensity): Scene {
  return composeScene(
    driftParticles({
      count: scaleCount(34, density),
      speedX: 6,
      speedY: 34,
      radius: 1.5,
      streak: 0.09,
      alpha: 0.5,
      windiness: 0.3,
    }),
    stitchedPath({
      rows: scaleCount(5, density),
      spread: 0.64,
      amplitude: 0.03,
      dash: 12,
      speed: 24,
      grabWidth: 0.15,
      grabDepth: 44,
    }),
  );
}
