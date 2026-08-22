"use client";

import { Float, Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { sphericalCloud } from "@/lib/experience/random";
import { useCssColors } from "@/lib/experience/use-css-colors";
import { usePointer } from "@/lib/experience/use-pointer";
import { useSceneBudget } from "@/lib/experience/use-scene-budget";

import { HERO_ENTER_EVENT } from "./hero-events";

/**
 * The hero environment.
 *
 * A floating platform in fog, a holographic core that answers the pointer, a
 * dust field and a starfield — the "digital world" the copy invites you into.
 * Everything here is decorative: the heading, the buttons and the links are
 * ordinary DOM in front of the canvas, so the section still reads and still
 * works with the canvas absent.
 *
 * Two rules shape the code:
 *
 * 1. **No hex.** Colours come from `--tone`, `--bg` and `--fg` through
 *    `useCssColors`, resolved against the hero section so the scene wears that
 *    section's own tone and follows the theme toggle.
 * 2. **The budget decides the size.** Particle counts and geometry detail are
 *    read from `useSceneBudget`, never chosen here — a phone gets the same
 *    scene with fewer of everything, not a different one.
 */

const TOKENS = ["--tone", "--bg", "--fg"] as const;
const TONE_SCOPE = '[data-tone="hero"]';

/** Neutral stand-ins for the single frame before the tokens are resolved. */
const SAFE = { tone: "white", bg: "black", fg: "white" };

interface SceneProps {
  /** False while the hero is off-screen or the tab is hidden — the loop stops. */
  active: boolean;
  /** True under `prefers-reduced-motion`: the world is built, but it holds still. */
  still: boolean;
}

export default function HeroScene({ active, still }: SceneProps) {
  const budget = useSceneBudget();
  const colors = useCssColors(TOKENS, TONE_SCOPE);

  const tone = colors["--tone"] ?? SAFE.tone;
  const bg = colors["--bg"] ?? SAFE.bg;
  const fg = colors["--fg"] ?? SAFE.fg;

  return (
    <Canvas
      // A range, not a number: R3F settles between the two, and the ceiling is
      // the budget's, so a retina phone never renders at 3x.
      dpr={[1, budget.maxDpr]}
      // "demand" halts the render loop rather than merely hiding the canvas,
      // which is what the spec means by pausing off-screen animation.
      frameloop={active && !still ? "always" : "demand"}
      camera={{ position: [0, 0.9, 7.4], fov: 46, near: 0.1, far: 120 }}
      gl={{ antialias: budget.tier !== "low", powerPreference: "high-performance" }}
      // The DOM in front owns every interaction; the canvas must not eat clicks.
      style={{ pointerEvents: "none" }}
    >
      {/* Fog is what turns a set of objects into a place: it hides the edge of
          the world instead of letting geometry stop in mid-air. */}
      <fog attach="fog" args={[bg, 7, 26]} />

      <ambientLight intensity={0.4} />
      <pointLight position={[0, 2.6, 2.4]} intensity={26} distance={22} color={tone} />
      <pointLight position={[-5, -1.5, -3]} intensity={16} distance={20} color={fg} />
      <directionalLight position={[4, 6, 5]} intensity={0.7} color={fg} />

      <CameraRig still={still} />

      <Core tone={tone} fg={fg} budget={budget} still={still} />
      <Platform tone={tone} budget={budget} />
      <Floaters tone={tone} fg={fg} still={still} />
      <Dust color={tone} count={budget.particles} still={still} />

      {budget.particles > 0 ? (
        <Stars
          radius={70}
          depth={45}
          count={Math.round(budget.particles * 0.6)}
          factor={3.2}
          saturation={0}
          fade
          speed={still ? 0 : 0.5}
        />
      ) : null}
    </Canvas>
  );
}

/**
 * Camera parallax, and the forward dash the ENTER WORLD button triggers.
 *
 * The dash arrives as a `hero:enter` window event rather than a prop or a
 * context value. The button lives in the DOM layer and the camera lives inside
 * the canvas, behind a dynamic import — an event is what keeps either from
 * having to know the other exists.
 */
function CameraRig({ still }: { still: boolean }) {
  const pointer = usePointer();
  const dash = useRef(0);
  const base = useMemo(() => new THREE.Vector3(0, 0.9, 7.4), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    function onEnter() {
      dash.current = 1;
    }

    window.addEventListener(HERO_ENTER_EVENT, onEnter);
    return () => window.removeEventListener(HERO_ENTER_EVENT, onEnter);
  }, []);

  useFrame(({ camera }, delta) => {
    if (still) return;

    // Decays back to zero, so the camera returns if the visitor stays put.
    dash.current = Math.max(0, dash.current - delta * 0.85);
    const push = easeOutCubic(dash.current) * 5.2;

    target.set(
      base.x + pointer.current.x * 0.85,
      base.y + pointer.current.y * 0.45,
      base.z - push,
    );

    // Frame-rate independent damping: the same feel at 60fps and at 144fps.
    camera.position.lerp(target, 1 - Math.pow(0.0015, delta));
    camera.lookAt(0, 0.3, 0);
  });

  return null;
}

/** The holographic core: a shell that breathes inside a counter-rotating cage. */
function Core({
  tone,
  fg,
  budget,
  still,
}: {
  tone: string;
  fg: string;
  budget: SceneBudget;
  still: boolean;
}) {
  const pointer = usePointer();
  const inner = useRef<THREE.Mesh>(null);
  const cage = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);

  // Icosahedron subdivision, not sphere segments: level 2 is ~320 triangles and
  // level 4 is ~5k, which is the right spread across the three tiers.
  const detail = budget.segments >= 96 ? 4 : budget.segments >= 48 ? 3 : 2;
  const fill = useMemo(() => new THREE.Color(tone).multiplyScalar(0.22), [tone]);

  useFrame(({ clock }, delta) => {
    if (still) return;
    const t = clock.elapsedTime;

    if (inner.current) {
      inner.current.rotation.y += delta * 0.25;
      inner.current.rotation.x = Math.sin(t * 0.4) * 0.14;
      // The core leans toward the pointer — the "reacts to the mouse" the spec
      // asks for, kept small so it reads as attention rather than as a puppet.
      inner.current.position.x += (pointer.current.x * 0.35 - inner.current.position.x) * 0.05;
      inner.current.position.y +=
        (0.35 + pointer.current.y * 0.22 - inner.current.position.y) * 0.05;
      inner.current.scale.setScalar(1 + Math.sin(t * 1.6) * 0.035);
    }

    if (cage.current && inner.current) {
      cage.current.rotation.y -= delta * 0.16;
      cage.current.rotation.z += delta * 0.08;
      cage.current.position.copy(inner.current.position);
    }

    if (halo.current && inner.current) {
      halo.current.rotation.z += delta * 0.5;
      halo.current.position.copy(inner.current.position);
    }
  });

  return (
    <group>
      <mesh ref={inner} position={[0, 0.35, 0]}>
        <icosahedronGeometry args={[1.12, detail]} />
        {/* Dark surface, bright emissive: the orb glows without washing out to
            a flat silhouette under the tone-coloured key light. */}
        <meshStandardMaterial
          color={fill}
          emissive={tone}
          emissiveIntensity={0.55}
          roughness={0.25}
          metalness={0.65}
          flatShading
        />
      </mesh>

      <mesh ref={cage} position={[0, 0.35, 0]}>
        <icosahedronGeometry args={[1.62, 1]} />
        <meshBasicMaterial color={tone} wireframe transparent opacity={0.22} />
      </mesh>

      {/* A thin torus read almost edge-on: the energy band around the core. */}
      <mesh ref={halo} position={[0, 0.35, 0]} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[2.05, 0.012, 8, Math.min(budget.segments * 2, 128)]} />
        <meshBasicMaterial color={fg} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

const RINGS = [2.3, 3.1, 3.9, 4.8, 5.8];

/** Concentric wireframe rings standing in for the floating island. */
function Platform({ tone, budget }: { tone: string; budget: SceneBudget }) {
  const segments = Math.min(budget.segments * 2, 128);

  return (
    <group position={[0, -1.75, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {RINGS.map((radius, index) => (
        <mesh key={radius}>
          <torusGeometry args={[radius, 0.008, 6, segments]} />
          <meshBasicMaterial
            color={tone}
            transparent
            // Fading outward dissolves the platform into the fog instead of
            // ending it at a hard outermost ring.
            opacity={0.34 - index * 0.055}
          />
        </mesh>
      ))}
    </group>
  );
}

const FLOATERS = [
  { position: [-3.4, 1.5, -1.6], scale: 0.5, shape: "octahedron" },
  { position: [3.3, 1.1, -0.9], scale: 0.42, shape: "torus" },
  { position: [-2.6, -0.9, 1.4], scale: 0.36, shape: "box" },
  { position: [2.8, -1.1, 1.1], scale: 0.44, shape: "tetrahedron" },
  { position: [0.4, 2.5, -2.6], scale: 0.34, shape: "octahedron" },
] as const satisfies readonly {
  position: readonly [number, number, number];
  scale: number;
  shape: string;
}[];

/** Geometry drifting around the core, on drei's `Float` rather than our own loop. */
function Floaters({ tone, fg, still }: { tone: string; fg: string; still: boolean }) {
  return (
    <>
      {FLOATERS.map((item, index) => (
        <Float
          key={`${item.shape}-${index}`}
          speed={still ? 0 : 1.1 + index * 0.18}
          rotationIntensity={still ? 0 : 0.8}
          floatIntensity={still ? 0 : 1.1}
          position={item.position}
        >
          <mesh scale={item.scale}>
            <FloaterGeometry shape={item.shape} />
            <meshBasicMaterial
              color={index % 2 === 0 ? tone : fg}
              wireframe
              transparent
              opacity={0.42}
            />
          </mesh>
        </Float>
      ))}
    </>
  );
}

function FloaterGeometry({ shape }: { shape: (typeof FLOATERS)[number]["shape"] }) {
  switch (shape) {
    case "torus":
      return <torusGeometry args={[0.8, 0.28, 10, 26]} />;
    case "box":
      return <boxGeometry args={[1, 1, 1]} />;
    case "tetrahedron":
      return <tetrahedronGeometry args={[1, 0]} />;
    default:
      return <octahedronGeometry args={[1, 0]} />;
  }
}

/**
 * Ambient dust.
 *
 * The cloud is rotated and bobbed as one object instead of rewriting its
 * position buffer every frame. At the high tier that buffer is thousands of
 * vertices — moving them on the CPU would cost more than the rest of the scene
 * combined, and at this scale the difference is not visible.
 */
function Dust({ color, count, still }: { color: string; count: number; still: boolean }) {
  const cloud = useRef<THREE.Points>(null);

  // Seeded, not `Math.random`: this runs during render, so an impure draw would
  // reshape the whole cloud on any re-render. Flattened on Y so the dust reads
  // as a haze over the platform rather than a ball the camera sits inside.
  const positions = useMemo(
    () => sphericalCloud(count, { seed: 0x5eed, inner: 3, outer: 12, flatten: 0.45 }),
    [count],
  );

  useFrame(({ clock }, delta) => {
    if (still || !cloud.current) return;
    cloud.current.rotation.y += delta * 0.045;
    cloud.current.position.y = Math.sin(clock.elapsedTime * 0.3) * 0.25;
  });

  if (count === 0) return null;

  return (
    <points ref={cloud}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.035}
        sizeAttenuation
        transparent
        opacity={0.7}
        // Additive over an unwritten depth buffer: motes blend with whatever is
        // behind them instead of punching holes in the fog.
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
