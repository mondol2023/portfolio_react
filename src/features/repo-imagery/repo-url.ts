/**
 * Reading a repository out of whatever the author pasted.
 *
 * Pure and dependency-free so the admin panel can use it to grey out its own
 * button before a round trip, and the server can use the same function again as
 * the thing that actually decides.
 *
 * That second use is the important one. Every URL this feature later builds —
 * the API call, the raw-content base, the social card — is assembled from
 * `owner` and `repo` by string concatenation, so these two values are the only
 * place an arbitrary host could be smuggled in. They are matched against
 * GitHub's own naming rules rather than merely escaped: an owner is letters,
 * digits and hyphens, a repository adds dots and underscores, and neither can
 * contain a slash, a colon or a dot-dot.
 */

export interface RepoRef {
  owner: string;
  repo: string;
}

const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO = /^[A-Za-z0-9._-]{1,100}$/;

/** `owner/repo`, once the surrounding syntax has been stripped off. */
function fromSegments(owner: string | undefined, repo: string | undefined): RepoRef | null {
  if (!owner || !repo) return null;

  const name = repo.replace(/\.git$/i, "");
  if (!OWNER.test(owner) || !REPO.test(name)) return null;
  // `.` and `..` pass the character class but are path traversal, not names.
  if (name === "." || name === "..") return null;

  return { owner, repo: name };
}

/**
 * Accepts an https URL, an `git@github.com:owner/repo.git` clone line, or the
 * bare `owner/repo` shorthand. Deep links are fine — `/tree/main/src` and
 * `/blob/…` carry the repository in the same first two segments.
 *
 * Returns `null` rather than throwing: the caller is a form field that the
 * author is still halfway through typing.
 */
export function parseRepoRef(input: string): RepoRef | null {
  const value = input.trim();
  if (value === "") return null;

  const ssh = /^git@github\.com:(.+)$/i.exec(value);
  if (ssh?.[1]) {
    const [owner, repo] = ssh[1].split("/");
    return fromSegments(owner, repo);
  }

  if (!value.includes("://")) {
    // Either the shorthand, or a host-less paste like `github.com/owner/repo`.
    const parts = value.replace(/^github\.com\//i, "").split("/");
    return fromSegments(parts[0], parts[1]);
  }

  try {
    const url = new URL(value);
    if (url.hostname !== "github.com" && url.hostname !== "www.github.com") return null;

    const parts = url.pathname.split("/").filter(Boolean);
    return fromSegments(parts[0], parts[1]);
  } catch {
    return null;
  }
}

/** The canonical `https://github.com/owner/repo`, for display. */
export function repoUrl(ref: RepoRef): string {
  return `https://github.com/${ref.owner}/${ref.repo}`;
}
