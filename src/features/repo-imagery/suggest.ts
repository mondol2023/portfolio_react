import "server-only";

import { isAllowedImageSrc } from "@/lib/constants/images";

import {
  COVER_VARIANTS,
  COVER_VARIANT_LABELS,
  type CoverParams,
  type CoverTheme,
  encodeCoverParams,
  hueForRepo,
} from "./cover";
import { fetchReadme, fetchRepoFacts, RepoLookupError, type RepoFacts } from "./github";
import { harvestReadmeImages } from "./harvest";
import { parseRepoRef } from "./repo-url";
import { signedCoverPath } from "./signature";
import { searchStock, stockQuery } from "./stock";
import type { ImageCandidate, RepoImagerySuggestion } from "./types";

/**
 * One GitHub URL in, a set of pickable images out.
 *
 * Three sources, in the order the author most likely wants them:
 *
 * 1. **Generated** — covers drawn from the repository's own facts. Always
 *    available, never a copyright question, and the only source that can put
 *    the project's actual name on the image.
 * 2. **Repository** — the screenshots and demo GIFs already committed to the
 *    README, plus GitHub's rendered social card. This is the literal reading of
 *    "images according to the project": they are pictures *of* the thing.
 * 3. **Stock** — related free photography, when a key is configured.
 *
 * A failure in the second or third source degrades to a note. Only the initial
 * repository lookup can fail the whole call, because without it there is
 * nothing to be about.
 */

/** How many README images are worth showing before it turns into a file browser. */
const README_LIMIT = 6;
const STOCK_LIMIT = 6;

const THEMES: CoverTheme[] = ["light", "dark"];

/** The chips along the bottom of a generated cover. */
function metaChips(facts: RepoFacts): string[] {
  const chips: string[] = [];
  if (facts.language !== "") chips.push(facts.language);
  for (const topic of facts.topics.slice(0, 2)) chips.push(topic.replace(/-/g, " "));
  if (facts.stars >= 10) chips.push(`★ ${facts.stars.toLocaleString("en-US")}`);
  return chips.slice(0, 4);
}

function generatedCandidates(facts: RepoFacts): ImageCandidate[] {
  const hue = hueForRepo(facts.language, `${facts.owner}/${facts.repo}`);
  const base: Omit<CoverParams, "variant" | "theme"> = {
    title: facts.repo.replace(/[-_]/g, " "),
    subtitle: facts.description,
    meta: metaChips(facts),
    hue,
  };

  const candidates: ImageCandidate[] = [];

  for (const theme of THEMES) {
    for (const variant of COVER_VARIANTS) {
      const params: CoverParams = { ...base, variant, theme };
      candidates.push({
        id: `generated-${variant}-${theme}`,
        source: "generated",
        // Root-relative, so it needs no host allow-listing and keeps working if
        // the site ever moves domain.
        url: signedCoverPath(encodeCoverParams(params)),
        label: COVER_VARIANT_LABELS[variant],
        detail: theme === "dark" ? "Dark" : "Light",
        renderable: true,
      });
    }
  }

  return candidates;
}

/**
 * GitHub's own card for the repository.
 *
 * The leading `1` is the cache generation GitHub puts in the path; it is not a
 * parameter we control, and keeping it constant means the URL stored on a
 * project stays the same image.
 */
function socialCard(facts: RepoFacts): ImageCandidate {
  const url = `https://opengraph.githubassets.com/1/${facts.owner}/${facts.repo}`;
  return {
    id: "repo-social-card",
    source: "repo",
    url,
    label: "GitHub social card",
    detail: "Rendered by GitHub from the repository",
    creditUrl: `https://github.com/${facts.owner}/${facts.repo}`,
    renderable: isAllowedImageSrc(url),
  };
}

/** A README path, shortened to something that fits on one line of a tile. */
function fileLabel(url: string): string {
  const path = url.split("?")[0] ?? url;
  const name = path.slice(path.lastIndexOf("/") + 1);
  return name === "" ? "Image" : decodeURIComponent(name);
}

export async function suggestImagery(input: string): Promise<RepoImagerySuggestion> {
  const ref = parseRepoRef(input);
  if (!ref) {
    throw new RepoLookupError(
      "not-found",
      "That does not look like a GitHub repository. Try https://github.com/owner/repo.",
    );
  }

  const facts = await fetchRepoFacts(ref);

  const notes: string[] = [];
  const candidates: ImageCandidate[] = [...generatedCandidates(facts), socialCard(facts)];

  // README images. A repository with no README is ordinary, not an error.
  try {
    const readme = await fetchReadme({ owner: facts.owner, repo: facts.repo });
    if (readme) {
      const harvest = harvestReadmeImages(readme.markdown, {
        owner: facts.owner,
        repo: facts.repo,
        branch: facts.defaultBranch,
        dir: readme.dir,
      });

      for (const image of harvest.images.slice(0, README_LIMIT)) {
        candidates.push({
          id: `repo-readme-${image.url}`,
          source: "repo",
          url: image.url,
          label: image.alt !== "" ? image.alt : fileLabel(image.url),
          detail: "From the README",
          creditUrl: `https://github.com/${facts.owner}/${facts.repo}`,
          renderable: isAllowedImageSrc(image.url),
        });
      }

      if (harvest.images.length === 0) {
        notes.push("The README has no usable images.");
      }
      if (harvest.skippedBadges > 0) {
        notes.push(`Skipped ${harvest.skippedBadges} status badge(s) in the README.`);
      }
      if (harvest.skippedSvg > 0) {
        notes.push(
          `Skipped ${harvest.skippedSvg} SVG(s): this site does not render remote SVG images.`,
        );
      }
    } else {
      notes.push("This repository has no README, so there were no screenshots to find.");
    }
  } catch (error) {
    console.error("[repo-imagery] readme harvest failed", error);
    notes.push("Could not read the README; the other sources are unaffected.");
  }

  // Stock photography, when a key is configured.
  const stock = await searchStock(
    stockQuery({
      description: facts.description,
      language: facts.language,
      topics: facts.topics,
    }),
    STOCK_LIMIT,
  );
  candidates.push(...stock.candidates);
  if (stock.note) notes.push(stock.note);

  return {
    repo: {
      owner: facts.owner,
      repo: facts.repo,
      description: facts.description,
      language: facts.language,
      topics: facts.topics,
      stars: facts.stars,
      homepage: facts.homepage,
    },
    candidates,
    notes,
  };
}
