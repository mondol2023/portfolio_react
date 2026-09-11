import "server-only";

import type { Project } from "@/lib/types/content";

import {
  COVER_VARIANTS,
  encodeCoverParams,
  hueForRepo,
  hueFromSeed,
  type CoverParams,
  type CoverVariant,
} from "./cover";
import { signedCoverPath } from "./signature";

/**
 * Generated covers for the demo/seed projects.
 *
 * `DEMO_PROJECTS` (`demo-content.ts`) deliberately ships with no
 * `featuredImage`/`gallery` — Atlas, Beacon and the rest are fictional, so
 * the harvest and stock-photo sources in this feature have no real
 * repository to find anything on. **Generated covers** (`cover.ts`) are the
 * only source that needs nothing but text, which is what a demo project has.
 *
 * The URL is computed here, at read time, rather than hand-pasted into
 * `demo-content.ts`: a stored signed URL would start 403ing the moment
 * `REPO_IMAGERY_SECRET` is set (see `signature.ts`), and computing it fresh
 * on every read sidesteps that entirely while keeping the demo working
 * offline, matching `demo-content.ts`'s own stated intent.
 */

const DEMO_COVER_THEME = "dark";

/**
 * Two distinct variants for one project, chosen deterministically from its id
 * so the same demo project always gets the same pair across requests and
 * deploys. The secondary sits two positions around `COVER_VARIANTS` from the
 * primary — with four variants that is the one offset that is never adjacent
 * and never equal, so the hover-reveal always swaps to something that reads
 * as a genuinely different layout rather than a near-twin.
 */
function variantPairFor(seed: string): [CoverVariant, CoverVariant] {
  const primaryIndex = hueFromSeed(seed) % COVER_VARIANTS.length;
  const secondaryIndex = (primaryIndex + 2) % COVER_VARIANTS.length;
  return [COVER_VARIANTS[primaryIndex]!, COVER_VARIANTS[secondaryIndex]!];
}

/** The chips along the bottom: the project type plus its headline stack. */
function metaFor(project: Project): string[] {
  return [project.type, ...project.technologies].filter(Boolean).slice(0, 4);
}

function coverUrl(project: Project, variant: CoverVariant): string {
  const language = project.technologies[0] ?? "";
  const params: CoverParams = {
    title: project.title,
    subtitle: project.shortDescription,
    meta: metaFor(project),
    variant,
    hue: hueForRepo(language, project.id),
    theme: DEMO_COVER_THEME,
  };
  return signedCoverPath(encodeCoverParams(params));
}

/**
 * A demo project as it should be read: a generated primary cover plus a
 * genuinely different generated secondary in `gallery`, so the existing
 * hover-reveal in `project-card.tsx` has a real second frame to crossfade to.
 * A project that already carries its own `featuredImage` is returned as-is —
 * this only fills the gap the demo set ships with, it never overrides real
 * data.
 */
export function withDemoCover(project: Project): Project {
  if (project.featuredImage) return project;

  const [primary, secondary] = variantPairFor(project.id);

  return {
    ...project,
    featuredImage: coverUrl(project, primary),
    gallery: project.gallery.length > 0 ? project.gallery : [coverUrl(project, secondary)],
  };
}

export function withDemoCovers(projects: Project[]): Project[] {
  return projects.map(withDemoCover);
}
