"use client";

import { useEffect, useRef } from "react";

/**
 * Pointer position in normalised device coordinates, as a ref.
 *
 * A ref rather than state, deliberately: this value updates on every pointer
 * move, and routing that through `useState` would re-render the whole subtree
 * at pointer-event frequency. Consumers are animation loops — R3F's
 * `useFrame`, a Motion value — which read `.current` and never need a render.
 *
 * `x` and `y` run -1..1 with y pointing up, matching Three.js screen space so
 * scenes can feed the value straight into a camera or raycaster.
 */
export function usePointer(): { current: { x: number; y: number } } {
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // `passive` because we never call `preventDefault` here — it lets the
    // browser keep scrolling on the compositor thread while we track.
    function onMove(event: PointerEvent) {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((event.clientY / window.innerHeight) * 2 - 1);
    }

    // A pointer that has left the window should decay to centre rather than
    // freezing the scene mid-tilt.
    function onLeave() {
      pointer.current.x = 0;
      pointer.current.y = 0;
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return pointer;
}
