import { INTERACTION } from "../config/game-config";

/**
 * The safety valve between the world and the document.
 *
 * Interaction is window-level by design (the canvas never takes pointer
 * events), so every press is checked against the element it actually landed
 * on first. Presses on anything interactive or prose-bearing are ignored
 * completely — no grab, no `preventDefault`, no interference with links,
 * buttons, form fields, or text selection. This is the guarantee that the
 * world can never block the portfolio.
 */
export function isBlockedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;
  return target.closest(INTERACTION.targetBlocklist) !== null;
}
