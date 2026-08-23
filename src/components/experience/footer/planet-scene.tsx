"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { sphericalCloud } from "@/lib/experience/random";
import { useCssColors } from "@/lib/experience/use-css-colors";
import { useSceneBudget } from "@/lib/experience/use-scene-budget";

/**
 * The world the visitor has been walking around, seen from outside it.
 *
 * The last thing on the page, so it is the smallest scene here on purpose: a
 * wireframe globe, a tilted ring, one satellite on a real orbit, and the same
 * dust that has been in the air since the hero. Nothing in it is interactive —
 * a footer is where people leave from, and a canvas that wants attention at the
 * exit is a canvas fighting the reader.
 *
 * Same two rules as every other scene: colour from `useCssColors`, size from
 * `useSceneBudget`. Everything animated here is a transform, so `still` can
 * freeze the loop outright without stranding a material mid-damp the way an
 * imperatively animated opacity would under `frameloop="demand"`.
 */

const TOKENS = ["--tone", "--fg"] as const;
const TONE_SCOPE = '[data-tone="contact"]';
const SAFE = { tone: "white", fg: "white" };

/** Radius of the globe, in world units. Everything else is sized off it. */
const RADIUS = 1.35;

interface SceneProps {
  active: boolean;
  still: boolean;
}

export default function PlanetScene({ active, still }: SceneProps) {
  const budget = useSceneBudget();
  const colors = useCssColors(TOKENS, TONE_SCOPE);
  const tone = colors["--tone"] ?? SAFE.tone;
  const fg = colors["--fg"] ?? SAFE.fg;

  return (
    <Canvas
      dpr={[1, budget.maxDpr]}
      frameloop={active && !still ? "always" : "demand"}
      camera={{ position: [0, 0.9, 5.2], fov: 40, near: 0.1, far: 24 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ pointerEvents: "none" }}
    >
      <System tone={tone} fg={fg} segments={budget.segments} still={still} />
      <Dust color={tone} count={Math.min(budget.particles, 120)} still={still} />
    </Canvas>
  );
}

/**
 * Globe, ring and satellite as one rig.
 *
 * They share a parent so the whole system carries one axial tilt, and so the
 * satellite orbits the planet rather than the origin — it is positioned in the
 * parent's space, which stays correct however the group is turned.
 */
function System({
  tone,
  fg,
  segments,
  still,
}: {
  tone: string;
  fg: string;
  segments: number;
  still: boolean;
}) {
  const globe = useRef<THREE.LineSegments>(null);
  const satellite = useRef<THREE.Group>(null);

  // A wireframe built once from the budget's segment count. `WireframeGeometry`
  // rather than `material.wireframe`, so the lines are real geometry and stay
  // one pixel wide instead of thickening as the sphere fills the frame.
  const wireframe = useMemo(() => {
    const detail = Math.max(8, Math.round(segments / 2));
    const sphere = new THREE.SphereGeometry(RADIUS, detail, Math.round(detail * 0.6));
    const wire = new THREE.WireframeGeometry(sphere);
    sphere.dispose();
    return wire;
  }, [segments]);

  useFrame((state, delta) => {
    if (still) return;

    if (globe.current) globe.current.rotation.y += delta * 0.16;

    if (satellite.current) {
      const angle = state.clock.elapsedTime * 0.55;
      satellite.current.position.set(
        Math.cos(angle) * RADIUS * 1.75,
        Math.sin(angle) * RADIUS * 0.35,
        Math.sin(angle) * RADIUS * 1.75,
      );
    }
  });

  return (
    <group rotation={[0.32, 0, 0.22]}>
      <lineSegments ref={globe}>
        <primitive object={wireframe} attach="geometry" />
        <lineBasicMaterial color={tone} transparent opacity={0.45} />
      </lineSegments>

      {/* A solid core just inside the wireframe, so the far side of the globe is
          occluded and the sphere reads as a body rather than a cage. */}
      <mesh>
        <sphereGeometry args={[RADIUS * 0.97, segments, segments]} />
        <meshBasicMaterial color={fg} transparent opacity={0.06} />
      </mesh>

      <mesh rotation={[Math.PI / 2.35, 0, 0]}>
        <torusGeometry args={[RADIUS * 1.75, 0.012, 3, Math.max(48, segments * 2)]} />
        <meshBasicMaterial color={tone} transparent opacity={0.5} />
      </mesh>

      <group ref={satellite} position={[RADIUS * 1.75, 0, 0]}>
        <mesh>
          <sphereGeometry args={[0.075, 12, 12]} />
          <meshBasicMaterial color={tone} />
        </mesh>
      </group>
    </group>
  );
}

/** The same ambient haze as the hero and the arcade, at footer scale. */
function Dust({ color, count, still }: { color: string; count: number; still: boolean }) {
  const cloud = useRef<THREE.Points>(null);

  const positions = useMemo(
    () => sphericalCloud(count, { seed: 0xf007, inner: 2.4, outer: 6.5, flatten: 0.75 }),
    [count],
  );

  useFrame((_, delta) => {
    if (still || !cloud.current) return;
    cloud.current.rotation.y -= delta * 0.02;
  });

  if (count === 0) return null;

  return (
    <points ref={cloud}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.028}
        sizeAttenuation
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
