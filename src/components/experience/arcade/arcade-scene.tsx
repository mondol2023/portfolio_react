"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { sphericalCloud } from "@/lib/experience/random";
import { useCssColors } from "@/lib/experience/use-css-colors";
import { useSceneBudget } from "@/lib/experience/use-scene-budget";

/**
 * The arcade grid's atmosphere: ambient dust drifting behind the cartridges,
 * plus a burst of sparks that blooms wherever the pointer sits while a
 * cartridge is hovered — the "particles" half of the cartridge hover effect,
 * kept in one shared canvas rather than one per card (a canvas per hover
 * target would be the same cost paid N times over for the same effect).
 *
 * Same two rules as every other scene here: colour from `useCssColors`
 * scoped to `[data-tone="work"]`, size from `useSceneBudget`.
 */

const TOKENS = ["--tone"] as const;
const TONE_SCOPE = '[data-tone="work"]';
const SAFE = { tone: "white" };

interface SceneProps {
  active: boolean;
  still: boolean;
  hovered: boolean;
}

export default function ArcadeScene({ active, still, hovered }: SceneProps) {
  const budget = useSceneBudget();
  const colors = useCssColors(TOKENS, TONE_SCOPE);
  const tone = colors["--tone"] ?? SAFE.tone;

  return (
    <Canvas
      dpr={[1, budget.maxDpr]}
      frameloop={active && !still ? "always" : "demand"}
      camera={{ position: [0, 0, 8], fov: 45, near: 0.1, far: 30 }}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      style={{ pointerEvents: "none" }}
    >
      <Dust color={tone} count={budget.particles} still={still} />
      <HoverBurst color={tone} count={Math.min(budget.particles, 60)} still={still} hovered={hovered} />
    </Canvas>
  );
}

/** Slow ambient haze, identical technique to the hero's `Dust`. */
function Dust({ color, count, still }: { color: string; count: number; still: boolean }) {
  const cloud = useRef<THREE.Points>(null);

  const positions = useMemo(
    () => sphericalCloud(count, { seed: 0xca4e, inner: 3, outer: 11, flatten: 0.6 }),
    [count],
  );

  useFrame((_, delta) => {
    if (still || !cloud.current) return;
    cloud.current.rotation.y += delta * 0.03;
  });

  if (count === 0) return null;

  return (
    <points ref={cloud}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.03}
        sizeAttenuation
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/**
 * Raw pointer position in client coordinates.
 *
 * The shared `usePointer` normalises against the *window*, which is right for
 * a full-bleed hero but wrong here: this canvas is a band across the middle of
 * the section, so a cursor at the top of a card would put the burst well above
 * it. This keeps the untransformed coordinates and lets the frame loop map
 * them against the canvas, which is the only place the canvas's own box and
 * the camera's world extents are both known.
 *
 * A `pointermove` listener on the window rather than the canvas, because the
 * canvas is `pointer-events: none` — it sits behind the cards and must never
 * intercept a click meant for one.
 */
function useClientPointer() {
  const point = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    function onMove(event: PointerEvent) {
      point.current = { x: event.clientX, y: event.clientY };
    }

    function onLeave() {
      point.current = null;
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return point;
}

/**
 * A cloud of sparks that follows the pointer and fades in while `hovered` is
 * true. Position and opacity both damp toward their targets rather than
 * snapping, so the burst reads as trailing the cursor instead of teleporting
 * card to card.
 */
function HoverBurst({
  color,
  count,
  still,
  hovered,
}: {
  color: string;
  count: number;
  still: boolean;
  hovered: boolean;
}) {
  const client = useClientPointer();
  const canvas = useThree((state) => state.gl.domElement);
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.PointsMaterial>(null);
  const opacity = useRef(0);

  const positions = useMemo(
    () => sphericalCloud(count, { seed: 0x5091, inner: 0.1, outer: 0.6 }),
    [count],
  );

  useFrame(({ viewport }, delta) => {
    if (still || !group.current) return;

    const point = client.current;
    if (point) {
      // Read once per frame rather than per pointer event: `pointermove` fires
      // far more often than we draw, and each rect read is a forced layout.
      const rect = canvas.getBoundingClientRect();
      // Canvas-relative -1..1, then scaled by the camera's world extents at
      // z = 0 — which is the group's plane — so the burst lands under the
      // cursor instead of merely near it.
      const nx = ((point.x - rect.left) / rect.width) * 2 - 1;
      const ny = -(((point.y - rect.top) / rect.height) * 2 - 1);

      group.current.position.x = THREE.MathUtils.damp(
        group.current.position.x,
        (nx * viewport.width) / 2,
        6,
        delta,
      );
      group.current.position.y = THREE.MathUtils.damp(
        group.current.position.y,
        (ny * viewport.height) / 2,
        6,
        delta,
      );
    }

    // A slow tumble, so a burst that has settled under a stationary cursor
    // still reads as alive rather than as a decal stuck to the page.
    group.current.rotation.y += delta * 0.6;
    group.current.rotation.x += delta * 0.25;

    opacity.current = THREE.MathUtils.damp(opacity.current, hovered && point ? 0.85 : 0, 5, delta);
    if (material.current) material.current.opacity = opacity.current;
  });

  if (count === 0) return null;

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={material}
          color={color}
          size={0.05}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
