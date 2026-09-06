/**
 * One visual layer of the river-path scene.
 *
 * Sky, skyline, paddy, boats, night accents — each owns one part of the
 * picture and knows nothing about the others. `index.ts` is the only file
 * that composes them, so a layer can be added, removed, or reordered there
 * without touching the rest (Open/Closed).
 */
export interface RiverLayer {
  /** Appended once to the scene's shared `<style>`. */
  css: string;
  /** Builds this layer's DOM and appends it under `root`. */
  mount(root: HTMLElement): void;
}
