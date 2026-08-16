import type { Skill } from "@/lib/types/content";

/**
 * Icon lookup for technologies named as free text.
 *
 * Experience entries and projects store their stack as plain strings — "React",
 * "PostgreSQL" — while the icon for a technology lives on the matching skill in
 * the stack section. This bridges the two by name, so setting an icon once in
 * /admin/skills lights it up everywhere that technology is mentioned.
 *
 * A miss is not a failure: `TechTile` falls back to a brand-tinted monogram, and
 * that is the normal case, since we do not ship third-party logo artwork.
 */

/** Normalised technology name → icon URL. */
export type TechIconMap = Readonly<Record<string, string>>;

/** Names are matched case- and space-insensitively: "Next.JS " matches "Next.js". */
function normalize(name: string): string {
  return name.trim().toLowerCase();
}

export function buildTechIconMap(skills: readonly Skill[]): TechIconMap {
  const map: Record<string, string> = {};

  for (const skill of skills) {
    if (skill.iconUrl) map[normalize(skill.name)] = skill.iconUrl;
  }

  return map;
}

export function lookupTechIcon(icons: TechIconMap, name: string): string | undefined {
  return icons[normalize(name)];
}
