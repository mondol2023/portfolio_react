/**
 * The cursor's vocabulary.
 *
 * One entry per state the cursor can be in, each describing the *shape* it
 * takes rather than the element that triggered it. Keeping this as data means
 * adding a state is a line here, not a new branch in the render, and it is the
 * reason `custom-cursor.tsx` contains no per-mode conditionals.
 *
 * `label` is drawn inside the ring. It is decorative — the ring is
 * `aria-hidden`, and every surface that sets a mode carries its own accessible
 * name — so it may be a verb fragment rather than a sentence.
 */

export type CursorMode = "default" | "button" | "link" | "project" | "scene" | "text" | "disabled";

export interface CursorShape {
  /** Diameter of the trailing ring, in px. */
  ring: number;
  /** Diameter of the centre dot, in px. 0 hides it. */
  dot: number;
  /** Ring border width, in px. */
  border: number;
  /** Ring fill opacity, 0–1. */
  fill: number;
  /** Optional text drawn inside the ring. */
  label?: string;
  /** Pull applied to magnetic targets, as a fraction of the offset to centre. */
  magnetism: number;
}

export const CURSOR_SHAPES: Record<CursorMode, CursorShape> = {
  // The resting state: a small ring that reads as a pointer, not a target.
  default: { ring: 32, dot: 5, border: 1, fill: 0, magnetism: 0 },
  // Buttons swell and fill — the cursor becomes the thing being pressed.
  button: { ring: 64, dot: 0, border: 1, fill: 0.14, magnetism: 0.35 },
  // Links stay hollow but widen, so a text link does not blot out its own label.
  link: { ring: 48, dot: 0, border: 1.5, fill: 0.06, magnetism: 0.2 },
  // Projects announce the action, since the whole card is the hit area.
  project: { ring: 92, dot: 0, border: 1, fill: 0.1, label: "OPEN", magnetism: 0.15 },
  // Over a canvas the cursor thins to a reticle: the scene is the subject now.
  scene: { ring: 40, dot: 3, border: 1, fill: 0, label: "DRAG", magnetism: 0 },
  // A caret-adjacent state — narrow ring, visible dot, no pull.
  text: { ring: 20, dot: 2, border: 1, fill: 0, magnetism: 0 },
  // Dimmed and inert, matching a disabled control's own affordance.
  disabled: { ring: 24, dot: 0, border: 1, fill: 0, magnetism: 0 },
};

/**
 * Selector that finds the nearest mode-bearing ancestor of an event target.
 *
 * `[data-cursor]` is the explicit opt-in; the rest are the native interactive
 * elements, so ordinary markup gets a sensible cursor without being annotated.
 */
export const CURSOR_TARGET_SELECTOR =
  "[data-cursor], a[href], button, [role='button'], input, textarea, select, summary";

/** Maps an element that matched the selector above onto a mode. */
export function modeForElement(element: HTMLElement): CursorMode {
  const explicit = element.dataset.cursor;
  if (explicit && explicit in CURSOR_SHAPES) return explicit as CursorMode;

  // `aria-disabled` counts: a disabled-looking control that is still focusable
  // should still read as inert to the pointer.
  if (element.matches(":disabled, [aria-disabled='true']")) return "disabled";

  const tag = element.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return "text";
  if (tag === "button" || element.getAttribute("role") === "button") return "button";
  if (tag === "a") return "link";

  return "default";
}
