/**
 * The shapes that cross the server-action boundary.
 *
 * Everything here is plain data. The panel is a Client Component and the
 * suggestion is built on the server, so anything that is not serialisable — a
 * `Response`, a class instance, a function — cannot appear in these types.
 */

/** Where a candidate came from, which is also how the panel groups them. */
export type CandidateSource = "generated" | "repo" | "stock";

export interface ImageCandidate {
  /** Stable within one suggestion; used as the React key and for selection. */
  id: string;
  source: CandidateSource;
  /** What gets written into the project when the author picks it. */
  url: string;
  /** Headline for the tile. */
  label: string;
  /** Second line: a photographer, a file path, a variant name. */
  detail?: string;
  /** Where the credit points, when there is one to give. */
  creditUrl?: string;
  /**
   * Unsplash's per-photo download endpoint. Pinging it when a photo is actually
   * used is a condition of their API terms, not an analytics nicety.
   */
  usageUrl?: string;
  /**
   * False when the host is not in the `next/image` allow-list. The tile still
   * shows — seeing why something is unusable beats it silently vanishing — but
   * it cannot be applied.
   */
  renderable: boolean;
}

/** What the repository turned out to be, echoed back so the panel can show it. */
export interface RepoSummary {
  owner: string;
  repo: string;
  description: string;
  language: string;
  topics: string[];
  stars: number;
  homepage: string;
}

export interface RepoImagerySuggestion {
  repo: RepoSummary;
  candidates: ImageCandidate[];
  /**
   * Anything the author should know that is not an error: a missing Unsplash
   * key, README images skipped for being SVG or badges. Rendered as a short
   * list under the results.
   */
  notes: string[];
}
