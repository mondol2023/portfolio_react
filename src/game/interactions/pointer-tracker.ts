/**
 * Window-level pointer state, updated at pointer-event frequency.
 *
 * A module-level mutable snapshot rather than React state or a store: this
 * value changes hundreds of times per second, and nothing rendering should
 * ever re-render for it. The frame loop and the interaction system read
 * `.current` directly.
 */
export interface PointerSnapshot {
  /** Normalised device coordinates, -1..1, y up — matches three.js. */
  ndc: { x: number; y: number };
  /** Raw client coordinates in px. */
  client: { x: number; y: number };
  /** Set on movement, cleared after the interaction system consumes it. */
  dirty: boolean;
}

export const pointerTracker: { current: PointerSnapshot } = {
  current: { ndc: { x: 0, y: 0 }, client: { x: 0, y: 0 }, dirty: false },
};

let installed = false;

/**
 * Installs the global `pointermove` listener exactly once. Returns a no-op for
 * the first caller's cleanup — the tracker is deliberately shared, so it
 * survives StrictMode's double mount and stays installed for the page's life.
 */
export function installPointerTracker(): () => void {
  if (installed) return () => {};
  installed = true;

  function onMove(event: PointerEvent): void {
    const snapshot = pointerTracker.current;
    snapshot.client.x = event.clientX;
    snapshot.client.y = event.clientY;
    snapshot.ndc.x = (event.clientX / window.innerWidth) * 2 - 1;
    snapshot.ndc.y = -((event.clientY / window.innerHeight) * 2 - 1);
    snapshot.dirty = true;
  }

  window.addEventListener("pointermove", onMove, { passive: true });
  return () => {};
}
