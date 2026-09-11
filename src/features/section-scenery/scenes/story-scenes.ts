import {
  DEFAULT_IDENTITY,
  identityProfile,
  type IdentityScene,
  type ProjectIdentity,
} from "@/lib/constants/project-identity";

import { scaleCount, type SceneDensity } from "../engine/density";
import { composeScene, type Scene } from "../engine/scene";
import { constellation } from "../primitives/constellation";
import { glowDisc } from "../primitives/glow-disc";
import { perspectiveRails } from "../primitives/perspective-rails";
import { waveBand } from "../primitives/wave-band";

/**
 * The four backdrops a case study moves through.
 *
 * A case study is one continuous read, so these are not six unrelated places the
 * way the landing sections are — they are four states of the same room, and the
 * order matters: open, tension, structure, clarity. The environment gets more
 * organised as the story does, which is the whole argument of the page made in
 * the layer behind it.
 *
 * They are built from the same primitives as every other scene and register in
 * the same `SCENES` record, so they inherit the shared loop, the cross-fade, the
 * frame budget and the density tiers for free. Nothing here is a second engine.
 *
 * Two things run through all four and are what make them one room rather than
 * four wallpapers. The **light** travels: high and central at the opening, low
 * and pushed off to one side under the tension, back to centre for the
 * structure, and centre-high and wide at the resolution — a lamp being carried
 * through, not four different lamps. And the **density falls**: eight rails,
 * then five bands, then a graph, then two swells. The backdrop gets quieter
 * exactly as the foreground gets more important, so the last chapter is read on
 * the emptiest stage on the page.
 *
 * **Whose room it is** is the project's. Each factory also takes an identity and
 * applies the deltas in `IdentityScene` to the numbers below: where the light
 * sits and how wide it is, how densely the field is populated and how far apart
 * it stands, how fast the whole thing idles. That is recomposition, not
 * escalation — the same four primitives, the same four scenes, the same loop and
 * the same frame budget. No new primitive was added for it and none of the four
 * acts changed its silhouette; `base` reproduces every number on this page
 * exactly, which is the test the layer has to pass.
 */

/** Positions are fractions of the canvas. A bias must never push one off it. */
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Element counts stay whole and never reach zero — an empty scene is a bug. */
const populated = (count: number, scene: IdentityScene) =>
  Math.max(1, Math.round(count * scene.populate));

/**
 * A period is the inverse of a tempo: an identity that idles slowly takes
 * *longer* to complete a cycle, so tempo divides here and multiplies on speeds.
 */
const paced = (period: number, scene: IdentityScene) =>
  Math.round((period / scene.tempo) * 100) / 100;

/**
 * Open — the road in.
 *
 * Deliberately a cousin of `work`: the reader has just come from the archive and
 * the camera should feel like it kept moving rather than cutting. Slower than
 * `work` and with a higher horizon, because this is the approach to one project
 * rather than the arrival at a wall of them.
 *
 * Thinned out from what `work` runs — eight rails and fourteen markers instead
 * of eleven and twenty, at half the brightness and two thirds the idle speed.
 * Act one is supposed to breathe; a wide, almost empty road does that better
 * than a detailed one, and every marker removed is whitespace the opening gets
 * back.
 */
export function storyOpenScene(
  density: SceneDensity,
  identity: ProjectIdentity = DEFAULT_IDENTITY,
): Scene {
  const scene = identityProfile(identity).scene;

  return composeScene(
    glowDisc({
      x: clamp01(0.5 + scene.bias),
      y: clamp01(0.26 + scene.lift),
      radius: 0.56 * scene.glow,
      alpha: 0.34,
      breathe: 0.035 * scene.pulse,
      period: paced(16, scene),
      rise: 0.12,
      follow: 0.025,
    }),
    perspectiveRails({
      // The vanishing point moves with the light, so a road lit from one side
      // is also aimed that way — two halves of one camera, not two decisions.
      vanishX: clamp01(0.5 + scene.bias),
      vanishY: clamp01(0.3 + scene.lift),
      rails: scaleCount(populated(8, scene), density),
      markers: scaleCount(populated(14, scene), density),
      idleSpeed: 0.15 * scene.tempo,
      arrivalSpeed: 1.3,
      alpha: 0.5,
      look: 0.03,
      scrollBoost: 1.3,
    }),
  );
}

/**
 * Tension — weight overhead.
 *
 * The swells are inverted: `baseline` sits near the top so the stack hangs above
 * the reading column and drifts down into it. This is the chapter about what was
 * hard, and it should feel like a low ceiling without ever becoming a
 * horror-film cue — no flashing, no sudden movement, nothing that pulls the eye
 * off the paragraph.
 *
 * It is the one scene in the set built for *separation* rather than atmosphere.
 * Five bands at a tighter spread and a larger amplitude means the swells
 * overlap and cross each other instead of sitting in parallel — layers you can
 * see past, which is what makes the space above the text read as deep. The
 * light is the dimmest and the furthest off-centre in the set and it sits
 * *below* the mass, so the contrast between the lit floor and the weighted
 * ceiling is the highest here too. Slower than every other scene: the friction
 * is that nothing is resolving quickly.
 */
export function storyTensionScene(
  density: SceneDensity,
  identity: ProjectIdentity = DEFAULT_IDENTITY,
): Scene {
  const scene = identityProfile(identity).scene;

  return composeScene(
    glowDisc({
      x: clamp01(0.3 + scene.bias),
      y: clamp01(0.74 + scene.lift),
      radius: 0.4 * scene.glow,
      alpha: 0.26,
      breathe: 0.025 * scene.pulse,
      period: paced(19, scene),
      follow: 0.015,
    }),
    waveBand({
      bands: scaleCount(populated(5, scene), density),
      // The amplitude is left alone on purpose: this is the low ceiling, and
      // how far the mass swings is the act's decision, not the project's.
      amplitude: 0.085,
      baseline: clamp01(0.14 + scene.lift),
      spread: 0.075 * scene.spread,
      speed: 0.13 * scene.tempo,
      alpha: 0.9,
      parallax: 0.03,
      gust: 0.34,
    }),
  );
}

/**
 * Structure — the thinking, drawn.
 *
 * A graph: the approach and solution chapters are where the pieces start
 * relating to each other, and the constellation is the one primitive whose
 * silhouette is literally "these things are connected".
 *
 * Tuned for construction rather than activity. The nodes drift at half the
 * speed they did and link across a longer distance, so the graph reads as a
 * diagram holding still and being *drawn* rather than a network in motion; the
 * sweep runs faster than the nodes do, which is the one thing here that carries
 * momentum. The light is returned to dead centre — after an act lit from the
 * side, a centred light is itself the feeling of things lining up.
 */
export function storyStructureScene(
  density: SceneDensity,
  identity: ProjectIdentity = DEFAULT_IDENTITY,
): Scene {
  const scene = identityProfile(identity).scene;

  return composeScene(
    glowDisc({
      x: clamp01(0.5 + scene.bias),
      y: clamp01(0.4 + scene.lift),
      radius: 0.62 * scene.glow,
      alpha: 0.36,
      breathe: 0.03 * scene.pulse,
      period: paced(14, scene),
      follow: 0.02,
    }),
    constellation({
      count: scaleCount(populated(24, scene), density),
      // The one place `spread` is literally a distance: a denser graph linked
      // further is a field of relationships, a sparser one linked shorter is a
      // set of parts. Same primitive, two readings.
      linkDistance: Math.round(210 * scene.spread),
      speed: 5.5 * scene.tempo,
      sweepPeriod: paced(9, scene),
      alpha: 0.9,
      lean: 18,
      scrollBoost: 2,
    }),
  );
}

/**
 * Clarity — it resolves.
 *
 * Two wide, low, slow swells under one centred light. The payoff chapters get
 * the calmest backdrop in the set on purpose: the composition in front of them
 * is the strongest on the page, and the environment's job at the end of a story
 * is to stop asking for attention.
 *
 * It used to be three swells. Removing one made the horizon read as a horizon
 * instead of as a stack, which is the §9 test — the composition got better by
 * losing an element, so it lost it. What is left is the widest light in the set,
 * barely breathing, barely following the reader, over the lowest and dimmest
 * water: a room that has settled.
 */
export function storyClarityScene(
  density: SceneDensity,
  identity: ProjectIdentity = DEFAULT_IDENTITY,
): Scene {
  const scene = identityProfile(identity).scene;

  return composeScene(
    glowDisc({
      x: clamp01(0.5 + scene.bias),
      y: clamp01(0.34 + scene.lift),
      radius: 0.68 * scene.glow,
      alpha: 0.46,
      // The resolution is where a pulse identity is most legible, because it is
      // the only thing left moving — and still under 8% of the radius.
      breathe: 0.03 * scene.pulse,
      period: paced(18, scene),
      follow: 0.01,
    }),
    waveBand({
      bands: scaleCount(populated(2, scene), density),
      amplitude: 0.028,
      baseline: clamp01(0.78 + scene.lift),
      spread: 0.11 * scene.spread,
      speed: 0.14 * scene.tempo,
      alpha: 0.6,
      parallax: 0.015,
      gust: 0.18,
    }),
  );
}
