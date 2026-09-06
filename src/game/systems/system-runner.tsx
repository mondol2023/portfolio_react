"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect } from "react";

import { pointerTracker } from "../interactions/pointer-tracker";

import type { GameSystem, SystemContext } from "./types";

/**
 * Ticks every world system exactly once per frame, in a fixed order.
 *
 * One `useFrame` for the whole world — systems never subscribe to the render
 * loop individually, which keeps their ordering deterministic and the frame
 * cost legible in one place. Context is assembled fresh per frame; nothing
 * captured during render is ever handed to a system to mutate.
 */
export function SystemRunner({ systems }: { systems: readonly GameSystem[] }) {
  useEffect(() => {
    return () => {
      for (const system of systems) system.dispose?.();
    };
  }, [systems]);

  useFrame((state, delta) => {
    const context: SystemContext = {
      delta,
      now: performance.now(),
      elapsed: state.clock.elapsedTime,
      camera: state.camera,
      visible: document.visibilityState === "visible",
    };

    // Consume pointer dirtiness once per frame so hover passes stay at frame
    // rate regardless of pointer-event frequency.
    void pointerTracker.current.dirty;

    for (const system of systems) {
      system.update(context);
    }
  });

  return null;
}
