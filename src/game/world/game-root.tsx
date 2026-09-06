"use client";

import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";

import { GameEffects } from "../components/game-effects";
import { useGameSettings } from "../components/game-provider";
import { useTabVisible } from "../hooks/use-tab-visible";
import { CAMERA } from "../config/game-config";
import { WorldComposition } from "./world-composition";

/**
 * The world inside the canvas.
 *
 * Owns the render loop and the physics runtime; composition lives below it in
 * `WorldComposition`, and camera behaviour lives in `CameraSystem` (ticked by
 * the runner — see `components/camera-controller.tsx` for the public slot).
 * The loop pauses entirely while the tab is hidden, and the physics step is
 * `vary`-timed so background throttling can't build up a debt of sim frames
 * on return.
 *
 * The canvas never accepts pointer events (`GameScene`'s wrapper is
 * `pointer-events: none`, mirrored here as belt-and-braces), so the document
 * above keeps every click, scroll and focus it had before the world existed.
 */
export function GameRoot() {
  const { budget, gravity } = useGameSettings();
  const visible = useTabVisible();

  return (
    <Canvas
      dpr={[1, budget.maxDpr]}
      camera={{ fov: CAMERA.fov, position: [...CAMERA.position], near: 0.1, far: 60 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      frameloop={visible ? "always" : "never"}
      style={{ pointerEvents: "none" }}
    >
      <Physics gravity={[0, gravity, 0]} timeStep="vary">
        <WorldComposition />
      </Physics>

      {/* Wired post-processing slot — renders nothing until a tier can pay for it. */}
      <GameEffects />
    </Canvas>
  );
}
