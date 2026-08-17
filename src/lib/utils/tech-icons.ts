import { canonicalTechKey } from "@/lib/constants/tech-brand";
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

  // Exact names first, so a skill always owns its own spelling before anything
  // looser is allowed to claim a key.
  for (const skill of skills) {
    if (skill.iconUrl) map[normalize(skill.name)] = skill.iconUrl;
  }

  /*
   * Then the loose form, which is what makes a skill named "React" light up a
   * role that lists "Reactjs". Existing keys are never overwritten: where two
   * skills reduce to the same key, whichever one was named exactly wins.
   */
  for (const skill of skills) {
    if (!skill.iconUrl) continue;
    const key = canonicalTechKey(skill.name);
    if (key && !(key in map)) map[key] = skill.iconUrl;
  }

  return map;
}

export function lookupTechIcon(icons: TechIconMap, name: string): string | undefined {
  return icons[normalize(name)] ?? icons[canonicalTechKey(name)];
}
