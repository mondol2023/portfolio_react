import { SKILL_CATEGORIES, type SkillCategory } from "@/lib/types/content";

/**
 * The skill galaxy's per-category palette.
 *
 * One CSS custom property per category, declared on `[data-tone="stack"]` in
 * `globals.css`. Everything that needs a category's colour comes through here
 * rather than inventing one: the planets and orbit rings resolve these tokens
 * with `useCssColors`, and the chips underneath the canvas hand the same
 * `var(--skill-…)` to CSS. A hue change is therefore one edit in one file, and
 * the sky and the buttons can never drift apart.
 *
 * Names, not values — this module never sees a hex literal, which is the point:
 * the light and dark variants live in the stylesheet where the theme switch can
 * reach them.
 */

export const SKILL_CATEGORY_TOKENS: Record<SkillCategory, string> = {
  languages: "--skill-languages",
  frontend: "--skill-frontend",
  backend: "--skill-backend",
  database: "--skill-database",
  tools: "--skill-tools",
};

/**
 * Every token in category order, as one stable module-level array.
 *
 * `useCssColors` keeps `names` in an effect dependency list, so a fresh array
 * per render would tear down and rebuild its `MutationObserver` every time.
 */
export const SKILL_COLOR_TOKENS: readonly string[] = SKILL_CATEGORIES.map(
  (category) => SKILL_CATEGORY_TOKENS[category],
);

/** The `var(...)` reference a DOM element should paint with. */
export function skillCategoryColor(category: SkillCategory): string {
  return `var(${SKILL_CATEGORY_TOKENS[category]})`;
}
