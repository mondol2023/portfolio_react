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
 *
 * The first six are the home page's sections. The four `story-*` tones are the
 * stages a case study passes through — opening, tension, structure, resolution
 * — and exist for the same reason the others do: the backdrop should tell the
 * reader where in the story they are. They are *stages*, not chapters, so a
 * seven-chapter case study still only changes its environment four times.
 */

export const SECTION_TONES = [
  "hero",
  "about",
  "stack",
  "work",
  "experience",
  "contact",
  "story-open",
  "story-tension",
  "story-structure",
  "story-clarity",
] as const;

export type SectionTone = (typeof SECTION_TONES)[number];

/** Tone used before the first section scrolls into the middle of the viewport. */
export const DEFAULT_TONE: SectionTone = "hero";

export function isSectionTone(value: string | null | undefined): value is SectionTone {
  return value != null && (SECTION_TONES as readonly string[]).includes(value);
}
