import { scaleCount, type SceneDensity } from "../engine/density";
import { composeScene, type Scene } from "../engine/scene";
import { constellation } from "../primitives/constellation";
import { glowDisc } from "../primitives/glow-disc";

/**
 * Stack — a network with a signal running through it.
 *
 * Scattered where the last two sections were continuous. The sweep is the whole
 * idea: tools that pass things to each other, shown once every seven seconds.
 *
 * The reader joins the graph rather than watching it — nearby nodes link to the
 * pointer and lean toward it — and scrolling drives the sweep, so the signal is
 * something they send rather than something they wait for.
 */
export function stackScene(density: SceneDensity): Scene {
  return composeScene(
    glowDisc({ x: 0.5, y: 0.5, radius: 0.62, alpha: 0.28, breathe: 0.04, period: 15, follow: 0.05 }),
    constellation({
      count: scaleCount(32, density),
      linkDistance: 155,
      speed: 11,
      sweepPeriod: 7,
      lean: 30,
      scrollBoost: 2.5,
    }),
  );
}
