/**
 * The parameters of a generated cover, and how they survive a URL.
 *
 * A generated cover is not a file. It is a query string that the cover route
 * renders on demand, which is what makes "generate an image" possible in a
 * codebase that stores images as URLs and has no upload path anywhere.
 *
 * Pure and dependency-free on purpose: the panel encodes the same params the
 * route decodes, and both sides agree by importing this file rather than by
 * agreeing informally.
 *
 * `decodeCoverParams` is the security-relevant half. The route hands whatever
 * comes back from it to a text renderer on our own domain, so every field is
 * clamped here — length, count, range, and a closed set for the variant — and
 * nothing downstream has to think about it again.
 */

export const COVER_VARIANTS = ["ribbon", "grid", "terminal", "aurora"] as const;

export type CoverVariant = (typeof COVER_VARIANTS)[number];

export type CoverTheme = "light" | "dark";

export interface CoverParams {
  title: string;
  subtitle: string;
  /** Short chips along the bottom: language, topics, a star count. */
  meta: string[];
  variant: CoverVariant;
  /** 0–359. Drives the accent; seeded from the repo so it is stable. */
  hue: number;
  theme: CoverTheme;
}

/*
 * Caps. Satori has no overflow handling worth the name — text that does not fit
 * simply runs off the canvas — so the limits are part of the layout, not just
 * hygiene. They are enforced on decode so a hand-written URL cannot beat them.
 */
const TITLE_MAX = 70;
const SUBTITLE_MAX = 120;
const META_MAX = 4;
const META_ITEM_MAX = 24;

/** Collapses whitespace and trims to `max`, so a cap never splits a line oddly. */
function clamp(value: string, max: number): string {
  const flat = value.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}

function isVariant(value: string): value is CoverVariant {
  return (COVER_VARIANTS as readonly string[]).includes(value);
}

/**
 * FNV-1a over the seed, folded into a hue.
 *
 * Any stable hash would do; the requirement is only that the same repository
 * always lands on the same colour, so a cover URL stored last month still
 * renders the image the author picked.
 */
export function hueFromSeed(seed: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    // The FNV prime, by shifts, to stay inside 32-bit integer maths.
    hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) >>> 0;
  }

  return hash % 360;
}

/**
 * Language hues, so a Rust cover is not accidentally green.
 *
 * Roughly GitHub's linguist colours, converted to a hue and nothing else — the
 * saturation and lightness belong to the cover design, not to the language.
 */
const LANGUAGE_HUES: Record<string, number> = {
  typescript: 217,
  javascript: 53,
  python: 207,
  rust: 18,
  go: 187,
  java: 25,
  kotlin: 271,
  swift: 14,
  ruby: 355,
  php: 244,
  "c++": 336,
  c: 210,
  "c#": 120,
  dart: 194,
  elixir: 282,
  haskell: 285,
  lua: 240,
  shell: 87,
  html: 12,
  css: 265,
  vue: 153,
  svelte: 15,
  scala: 0,
  zig: 36,
};

/** The hue for a repository: its language when we know it, else its name. */
export function hueForRepo(language: string, seed: string): number {
  return LANGUAGE_HUES[language.trim().toLowerCase()] ?? hueFromSeed(seed);
}

/** `CoverParams` → the query half of a cover URL, minus the signature. */
export function encodeCoverParams(params: CoverParams): URLSearchParams {
  const query = new URLSearchParams();

  query.set("t", clamp(params.title, TITLE_MAX));
  if (params.subtitle.trim() !== "") query.set("s", clamp(params.subtitle, SUBTITLE_MAX));

  const meta = params.meta
    .map((item) => clamp(item, META_ITEM_MAX))
    .filter((item) => item !== "")
    .slice(0, META_MAX);
  if (meta.length > 0) query.set("m", meta.join("|"));

  query.set("v", params.variant);
  query.set("h", String(Math.abs(Math.trunc(params.hue)) % 360));
  query.set("c", params.theme);

  return query;
}

/**
 * The query half of a cover URL → `CoverParams`, with every field forced into
 * range. Never throws and never returns null: a cover with a missing title is
 * still a valid image, and an admin preview that renders "Untitled" tells the
 * author more than a broken tile does.
 */
export function decodeCoverParams(query: URLSearchParams): CoverParams {
  const variant = query.get("v") ?? "";
  const hue = Number.parseInt(query.get("h") ?? "", 10);
  const theme = query.get("c") === "dark" ? "dark" : "light";

  return {
    title: clamp(query.get("t") ?? "", TITLE_MAX) || "Untitled",
    subtitle: clamp(query.get("s") ?? "", SUBTITLE_MAX),
    meta: (query.get("m") ?? "")
      .split("|")
      .map((item) => clamp(item, META_ITEM_MAX))
      .filter((item) => item !== "")
      .slice(0, META_MAX),
    variant: isVariant(variant) ? variant : "ribbon",
    hue: Number.isFinite(hue) ? Math.abs(hue) % 360 : 0,
    theme,
  };
}

/** Human-readable variant names, for the tile captions in the panel. */
export const COVER_VARIANT_LABELS: Record<CoverVariant, string> = {
  ribbon: "Ribbon",
  grid: "Blueprint grid",
  terminal: "Terminal",
  aurora: "Aurora",
};
