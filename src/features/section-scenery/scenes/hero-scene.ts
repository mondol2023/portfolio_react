import { scaleCount, type SceneDensity } from "../engine/density";
import { composeScene, type Scene } from "../engine/scene";
import { glowDisc } from "../primitives/glow-disc";
import { waveBand } from "../primitives/wave-band";

/**
 * Hero — a slow horizontal swell under a low sun.
 *
 * The opening image should be calm and wide, because it sits behind the largest
 * type on the site and has to lose that fight gracefully. Everything moves along
 * one axis and nothing blinks.
 *
 * The reader is weather here, not a cursor: a quick move raises the swell for a
 * moment and the stack slides a little against them. Both are kept low —
 * whatever else the hero does, it must not compete with the headline.
 */
export function heroScene(density: SceneDensity): Scene {
  return composeScene(
    glowDisc({ x: 0.62, y: 0.34, radius: 0.55, alpha: 0.55, breathe: 0.05, period: 11, follow: 0.03 }),
    waveBand({
      bands: scaleCount(5, density),
      amplitude: 0.05,
      baseline: 0.6,
      spread: 0.075,
      speed: 0.3,
      parallax: 0.03,
      gust: 0.45,
    }),
  );
}
