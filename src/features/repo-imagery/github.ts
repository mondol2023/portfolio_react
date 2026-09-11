import "server-only";

import { Buffer } from "node:buffer";

import type { RepoRef } from "./repo-url";

/**
 * The two GitHub reads this feature makes.
 *
 * Unauthenticated by default, which is the point: the whole feature works from
 * nothing but a pasted URL. GitHub allows 60 unauthenticated calls an hour per
 * IP and each suggestion costs two of them, so a `GITHUB_TOKEN` in the
 * environment is optional and only raises the ceiling.
 *
 * Failures are classified rather than swallowed. "No such repository", "you are
 * being rate-limited" and "GitHub is down" need three different sentences in
 * the admin, and only this module can tell them apart.
 */

const API = "https://api.github.com";
const TIMEOUT_MS = 8000;

export type RepoLookupReason = "not-found" | "rate-limited" | "unavailable";

export class RepoLookupError extends Error {
  constructor(
    readonly reason: RepoLookupReason,
    message: string,
  ) {
    super(message);
    this.name = "RepoLookupError";
  }
}

export interface RepoFacts {
  owner: string;
  repo: string;
  description: string;
  language: string;
  topics: string[];
  stars: number;
  homepage: string;
  defaultBranch: string;
  avatarUrl: string;
}

function headers(): HeadersInit {
  const token = process.env.GITHUB_TOKEN?.trim();
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    // GitHub rejects API requests without one.
    "User-Agent": "portfolio-repo-imagery",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function call(path: string): Promise<Response> {
  try {
    return await fetch(`${API}${path}`, {
      headers: headers(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // A repository's description and README change on a human timescale, and
      // a second look at the same repo while tweaking a cover should be free.
      next: { revalidate: 600 },
    });
  } catch (error) {
    console.error("[repo-imagery] github fetch failed", error);
    throw new RepoLookupError("unavailable", "GitHub did not answer in time.");
  }
}

/** Distinguishes a spent quota from a genuine refusal — both are 403. */
function classify(response: Response): RepoLookupError {
  if (response.status === 404) {
    return new RepoLookupError(
      "not-found",
      "No public repository at that address. Private repositories cannot be read.",
    );
  }

  const remaining = response.headers.get("x-ratelimit-remaining");
  if ((response.status === 403 || response.status === 429) && remaining === "0") {
    return new RepoLookupError(
      "rate-limited",
      "GitHub is rate-limiting this server. Wait an hour, or set GITHUB_TOKEN to raise the limit.",
    );
  }

  return new RepoLookupError("unavailable", `GitHub answered with ${response.status}.`);
}

/** Narrowing helpers — the API response is `unknown` until proven otherwise. */
function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function fetchRepoFacts(ref: RepoRef): Promise<RepoFacts> {
  const response = await call(`/repos/${ref.owner}/${ref.repo}`);
  if (!response.ok) throw classify(response);

  const data: unknown = await response.json();
  if (typeof data !== "object" || data === null) {
    throw new RepoLookupError("unavailable", "GitHub sent something unreadable.");
  }

  const body = data as Record<string, unknown>;
  const owner = body["owner"];

  return {
    // Echoed from the response, not from the input: this is the canonical
    // casing, and it is what the raw-content and card URLs have to use.
    owner: str(typeof owner === "object" && owner !== null
      ? (owner as Record<string, unknown>)["login"]
      : undefined) || ref.owner,
    repo: str(body["name"]) || ref.repo,
    description: str(body["description"]),
    language: str(body["language"]),
    topics: Array.isArray(body["topics"])
      ? body["topics"].filter((topic): topic is string => typeof topic === "string").slice(0, 8)
      : [],
    stars: num(body["stargazers_count"]),
    homepage: str(body["homepage"]),
    defaultBranch: str(body["default_branch"]) || "main",
    avatarUrl:
      typeof owner === "object" && owner !== null
        ? str((owner as Record<string, unknown>)["avatar_url"])
        : "",
  };
}

export interface Readme {
  markdown: string;
  /**
   * The directory the README lives in, with no leading or trailing slash —
   * `""` at the repository root, `.github` or `docs` otherwise. Relative image
   * paths in the file resolve against this, not against the root.
   */
  dir: string;
}

/**
 * The repository's README, or `null` when it has none.
 *
 * A missing README is not an error — plenty of repositories have none, and the
 * generated covers and the social card do not depend on it.
 */
export async function fetchReadme(ref: RepoRef): Promise<Readme | null> {
  const response = await call(`/repos/${ref.owner}/${ref.repo}/readme`);
  if (response.status === 404) return null;
  if (!response.ok) throw classify(response);

  const data: unknown = await response.json();
  if (typeof data !== "object" || data === null) return null;

  const body = data as Record<string, unknown>;
  const path = str(body["path"]);
  const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";

  // Base64 inline, except above ~1MB where GitHub sends an empty string and
  // expects a second request to the raw file.
  const encoded = str(body["content"]);
  if (encoded !== "") {
    return { markdown: Buffer.from(encoded, "base64").toString("utf8"), dir };
  }

  const download = str(body["download_url"]);
  if (!download.startsWith("https://raw.githubusercontent.com/")) return null;

  try {
    const raw = await fetch(download, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!raw.ok) return null;
    return { markdown: await raw.text(), dir };
  } catch {
    return null;
  }
}
