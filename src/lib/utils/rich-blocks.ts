/**
 * Plain-text CMS copy, grouped into the semantic blocks a renderer can style.
 *
 * The admin stores prose as plain text and never as HTML — a textarea that
 * accepted markup would be a stored-XSS vector on a public page — so the only
 * structure available is what a person types naturally. This module is the one
 * place that decides what those conventions mean, so `<RichText>` and the case
 * study's animated `<StoryProse>` cannot drift into disagreeing about where one
 * paragraph ends and the next begins.
 *
 * Three conventions, all of them things people already type:
 *
 *   blank line          starts a new block
 *   `- ` / `* ` / `• `  a run of them is a list
 *   `> `                a run of them is a quotation
 *
 * A run has to be uniform to count: one bulleted line inside four prose lines is
 * prose that happens to contain a dash, not a one-item list. Everything else is
 * a paragraph, rendered as text by React, which escapes it.
 */

export type RichBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "quote"; text: string };

const BULLET = /^\s*[-*•]\s+/;
const QUOTE = /^\s*>\s+/;

/** Splits on blank lines, dropping empty blocks left by trailing newlines. */
function toBlocks(content: string): string[] {
  return content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function parseRichBlocks(content: string): RichBlock[] {
  return toBlocks(content).map((block) => {
    const lines = block.split("\n").map((line) => line.trim());

    if (lines.every((line) => BULLET.test(line))) {
      return { kind: "list", items: lines.map((line) => line.replace(BULLET, "")) };
    }

    if (lines.every((line) => QUOTE.test(line))) {
      // Joined back with newlines rather than spaces: a quotation typed across
      // several lines was line-broken on purpose, and the renderers preserve
      // those breaks.
      return { kind: "quote", text: lines.map((line) => line.replace(QUOTE, "")).join("\n") };
    }

    return { kind: "paragraph", text: block };
  });
}

/**
 * A stable-enough React key for a block.
 *
 * Index alone would be wrong if a chapter's text is edited between renders, and
 * the text alone collides when the same short line appears twice, so it is both.
 */
export function blockKey(block: RichBlock, index: number): string {
  const text = block.kind === "list" ? block.items.join("|") : block.text;
  return `${index}-${text.slice(0, 24)}`;
}
