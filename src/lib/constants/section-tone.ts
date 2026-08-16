/**
 * Per-section colour identity.
 *
 * Each public section owns a hue so a visitor scrolling past can tell where
 * they are without reading the heading. The tone is applied by putting
 * `data-tone` on the section element; `globals.css` turns that attribute into
 * the `--tone` / `--tone-soft` custom properties, which Tailwind exposes as the
 * `tone` and `tone-soft` colours (`text-tone`, `border-tone`, `bg-tone-soft`).
 *
 * Only the *names* live here. The values are CSS because they need a light and
 * a dark variant, and because the animated background cross-fades between them
 * — a transition CSS can only run on registered custom properties, never on
 * values handed over from JavaScript.
 */

export const SECTION_TONES = ["hero", "about", "stack", "work", "experience", "contact"] as const;

export type SectionTone = (typeof SECTION_TONES)[number];

/** Tone used before the first section scrolls into the middle of the viewport. */
export const DEFAULT_TONE: SectionTone = "hero";

export function isSectionTone(value: string | null | undefined): value is SectionTone {
  return value != null && (SECTION_TONES as readonly string[]).includes(value);
}
