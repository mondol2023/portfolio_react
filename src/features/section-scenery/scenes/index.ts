import type { ProjectIdentity } from "@/lib/constants/project-identity";
import type { SectionTone } from "@/lib/constants/section-tone";

import type { SceneDensity } from "../engine/density";
import type { Scene } from "../engine/scene";
import { aboutScene } from "./about-scene";
import { contactScene } from "./contact-scene";
import { experienceScene } from "./experience-scene";
import { heroScene } from "./hero-scene";
import { stackScene } from "./stack-scene";
import {
  storyClarityScene,
  storyOpenScene,
  storyStructureScene,
  storyTensionScene,
} from "./story-scenes";
import { workScene } from "./work-scene";

/**
 * One scene per tone, built at a given workload tier.
 *
 * Each factory takes `density` and uses `scaleCount` on its primitives'
 * element counts — see `engine/density.ts`. `section-scenery.tsx` closes over
 * the current tier when it hands a factory to the render loop, which stays
 * unaware density exists at all: it only ever compares factory identity.
 *
 * The second argument is the project identity, and only the four story scenes
 * read it — the landing sections belong to the site, not to a project, and a
 * factory that ignores the parameter is assignable here unchanged.
 */
type ToneSceneFactory = (density: SceneDensity, identity: ProjectIdentity) => Scene;

/**
 * One scene per tone.
 *
 * Typed as a total `Record`, so adding a tone to `SECTION_TONES` fails the build
 * here rather than silently leaving that section with an empty backdrop.
 */
export const SCENES: Record<SectionTone, ToneSceneFactory> = {
  hero: heroScene,
  about: aboutScene,
  stack: stackScene,
  work: workScene,
  experience: experienceScene,
  contact: contactScene,
  "story-open": storyOpenScene,
  "story-tension": storyTensionScene,
  "story-structure": storyStructureScene,
  "story-clarity": storyClarityScene,
};
