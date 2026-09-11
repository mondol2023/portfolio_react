/**
 * Pulling the real screenshots out of a README.
 *
 * This is the source that actually answers "images according to the project":
 * whatever the author already committed next to the code — the demo GIF, the
 * dashboard screenshot, the architecture diagram. Nothing here is invented.
 *
 * Pure and synchronous, so the parsing can be reasoned about (and tested)
 * without a network.
 *
 * Two things are deliberately thrown away:
 *
 * - **Badges.** A README's first four images are almost always build status,
 *   licence and downloads. They are images by every syntactic measure and
 *   useless as project imagery, so they go by host and by filename.
 * - **SVG.** `next/image` refuses to optimise SVG unless the whole site opts in
 *   with `dangerouslyAllowSVG`, which would let any allow-listed host serve a
 *   document with script in it. Logos are the loss; it is not worth the trade.
 */

const RASTER = new Set(["png", "jpg", "jpeg", "gif", "webp", "avif"]);

/** Hosts that exist to serve status badges. */
const BADGE_HOSTS = new Set([
  "img.shields.io",
  "badgen.net",
  "badge.fury.io",
  "flat.badgen.net",
  "codecov.io",
  "coveralls.io",
  "snyk.io",
  "travis-ci.org",
  "travis-ci.com",
  "circleci.com",
  "api.netlify.com",
  "app.netlify.com",
  "forthebadge.com",
  "img.badgesize.io",
  "isitmaintained.com",
  "opencollective.com",
  "deepsource.io",
  "sonarcloud.io",
]);

/** Hosts where an extension-less path is still an image. */
const EXTENSIONLESS_OK = new Set([
  "user-images.githubusercontent.com",
  "camo.githubusercontent.com",
  "private-user-images.githubusercontent.com",
]);

/** Words that mark a picture of the thing, rather than a decoration. */
const PROMOTES = /screenshot|screen-shot|demo|preview|cover|banner|hero|dashboard|ui|interface|app|example|usage/i;
/** Words that mark a decoration, rather than a picture of the thing. */
const DEMOTES = /logo|icon|favicon|avatar|badge|shield|sponsor|divider|separator|arrow/i;

export interface HarvestedImage {
  url: string;
  /** The README's own alt text, when it wrote one. */
  alt: string;
  /** Higher sorts first. Document order breaks ties. */
  score: number;
}

export interface HarvestResult {
  images: HarvestedImage[];
  skippedSvg: number;
  skippedBadges: number;
}

/** Markdown `![alt](url "title")`, tolerating the `<url>` and title forms. */
const MARKDOWN_IMAGE = /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;
/** Inline HTML — READMEs use `<img>` whenever they want a width. */
const HTML_IMAGE = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
/** The `alt` of an `<img>`, read out of the tag the pattern above matched. */
const HTML_ALT = /\balt\s*=\s*["']([^"']*)["']/i;

/** `a/./b/../c` → `a/c`, without a `URL` and without touching the host. */
function normalisePath(path: string): string {
  const out: string[] = [];

  for (const segment of path.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      out.pop();
      continue;
    }
    out.push(segment);
  }

  return out.join("/");
}

/**
 * A README reference to an absolute URL.
 *
 * Relative paths become `raw.githubusercontent.com` URLs on the default branch
 * — the same file the reader sees on github.com, but served as an image rather
 * than as a page. Anything that is not http(s) after resolution is dropped;
 * that covers `data:` payloads and the odd `javascript:` in a hand-written tag.
 */
function absolutise(
  src: string,
  owner: string,
  repo: string,
  branch: string,
  dir: string,
): string | null {
  const value = src.trim();
  if (value === "") return null;

  if (value.startsWith("//")) return `https:${value}`;

  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return value.startsWith("https://") || value.startsWith("http://") ? value : null;
  }

  const base = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`;
  // A leading slash in a README means the repository root, not the web root.
  const path = value.startsWith("/") ? value.slice(1) : dir === "" ? value : `${dir}/${value}`;
  const clean = normalisePath(path.split(/[?#]/)[0] ?? "");

  return clean === "" ? null : base + clean;
}

type Verdict = "keep" | "svg" | "badge";

function judge(url: string): Verdict {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "badge";
  }

  if (BADGE_HOSTS.has(parsed.hostname)) return "badge";

  const path = parsed.pathname;
  const dot = path.lastIndexOf(".");
  const extension = dot === -1 ? "" : path.slice(dot + 1).toLowerCase();

  if (extension === "svg") return "svg";
  if (extension === "") {
    // GitHub's own attachment URLs carry no extension at all.
    const attachment =
      EXTENSIONLESS_OK.has(parsed.hostname) ||
      (parsed.hostname === "github.com" && path.startsWith("/user-attachments/assets/"));
    return attachment ? "keep" : "badge";
  }

  if (!RASTER.has(extension)) return "badge";
  // `.../build-badge.png` is still a badge.
  return /badge|shield/i.test(path) ? "badge" : "keep";
}

function score(url: string, alt: string): number {
  const subject = `${url} ${alt}`;
  let value = 0;
  if (PROMOTES.test(subject)) value += 3;
  if (DEMOTES.test(subject)) value -= 4;
  // A GIF in a README is nearly always the demo recording.
  if (/\.gif(?:$|[?#])/i.test(url)) value += 2;
  return value;
}

export function harvestReadmeImages(
  markdown: string,
  options: { owner: string; repo: string; branch: string; dir: string },
): HarvestResult {
  const found: { src: string; alt: string }[] = [];

  for (const match of markdown.matchAll(MARKDOWN_IMAGE)) {
    const src = match[2];
    if (src) found.push({ src, alt: match[1] ?? "" });
  }

  for (const match of markdown.matchAll(HTML_IMAGE)) {
    const src = match[1];
    if (src) found.push({ src, alt: HTML_ALT.exec(match[0])?.[1] ?? "" });
  }

  const seen = new Set<string>();
  const images: HarvestedImage[] = [];
  let skippedSvg = 0;
  let skippedBadges = 0;

  for (const { src, alt } of found) {
    const url = absolutise(src, options.owner, options.repo, options.branch, options.dir);
    if (!url || seen.has(url)) continue;
    seen.add(url);

    const verdict = judge(url);
    if (verdict === "svg") {
      skippedSvg += 1;
      continue;
    }
    if (verdict === "badge") {
      skippedBadges += 1;
      continue;
    }

    images.push({ url, alt: alt.trim(), score: score(url, alt) });
  }

  /*
   * A stable sort, so images the README gave no signal about stay in the order
   * the author wrote them — which is itself a signal, the hero shot first.
   */
  images.sort((a, b) => b.score - a.score);

  return { images, skippedSvg, skippedBadges };
}
