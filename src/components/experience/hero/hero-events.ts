/**
 * The one message the DOM layer sends the 3D layer.
 *
 * It lives in its own module on purpose. The button that fires it and the
 * camera that listens for it are on opposite sides of a `ssr: false` dynamic
 * import — if the constant lived in the scene file, importing the name would
 * drag Three.js into the button's bundle and undo the code splitting entirely.
 */

export const HERO_ENTER_EVENT = "hero:enter";

/** Fired when the visitor commits to entering; the camera answers by diving in. */
export function dispatchHeroEnter(): void {
  window.dispatchEvent(new CustomEvent(HERO_ENTER_EVENT));
}
