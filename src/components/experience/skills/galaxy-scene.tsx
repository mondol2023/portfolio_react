"use client";

import { Stars } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { sphericalCloud } from "@/lib/experience/random";
import { useCssColors } from "@/lib/experience/use-css-colors";
import { usePointer } from "@/lib/experience/use-pointer";
import { useSceneBudget } from "@/lib/experience/use-scene-budget";
import type { SkillCategory } from "@/lib/types/content";

import type { GalaxyLayout, GalaxyNode } from "./galaxy-layout";

/**
 * The skill galaxy.
 *
 * Every technology is a planet, every category an orbit. The system turns on
 * its own, answers a drag with inertia, grows and sparks the planet under the
 * pointer, and — when one is chosen — flies the camera out to it and lets the
 * rest of the sky fall dark.
 *
 * The canvas is decoration with a shortcut attached: selection also happens
 * from a list of ordinary buttons in the DOM next to it, so nothing here is the
 * only way to reach a skill. That is why the scene takes `selectedId` and
 * `hoveredId` as props instead of owning them — the list and the galaxy are two
 * views of one selection, and the parent holds it.
 *
 * Colours come from `--tone` and `--fg` resolved against the stack section, and
 * every count is the scene budget's. Nothing here picks a number for a phone.
 */

const TOKENS = ["--tone", "--bg", "--fg"] as const;
const TONE_SCOPE = '[data-tone="stack"]';

/** Neutral stand-ins for the single frame before the tokens resolve. */
const SAFE = { tone: "white", bg: "black", fg: "white" };

/** Radians of rotation per pixel dragged. */
const DRAG_RATE = 0.006;
/** Fraction of the throw velocity surviving each second after release. */
const INERTIA_DECAY = 0.04;
/** Idle rotation when nobody is touching it, in radians per second. */
const DRIFT = 0.07;
/** Pixels of movement after which a press is a drag and not a click. */
const DRAG_THRESHOLD = 6;

interface Spin {
  angle: number;
  velocity: number;
  dragging: boolean;
  /** True once a press has travelled far enough to be a drag. */
  moved: boolean;
  lastX: number;
}

interface GalaxySceneProps {
  layout: GalaxyLayout;
  /** False while the section is off-screen or the tab is hidden. */
  active: boolean;
  /** True under `prefers-reduced-motion`: the system is built, but it holds still. */
  still: boolean;
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

export default function GalaxyScene({
  layout,
  active,
  still,
  selectedId,
  hoveredId,
  onHover,
  onSelect,
}: GalaxySceneProps) {
  const budget = useSceneBudget();
  const colors = useCssColors(TOKENS, TONE_SCOPE);

  const tone = colors["--tone"] ?? SAFE.tone;
  const bg = colors["--bg"] ?? SAFE.bg;
  const fg = colors["--fg"] ?? SAFE.fg;

  const spin = useRef<Spin>({ angle: 0, velocity: 0, dragging: false, moved: false, lastX: 0 });
  // Where the camera is looking when a planet is chosen. The selected planet
  // writes its own world position here each frame, which spares the rig a
  // registry of every mesh in the system.
  const focus = useRef(new THREE.Vector3());

  const palette = useMemo(() => {
    const base = new THREE.Color(tone);
    const far = new THREE.Color(fg);
    const map = new Map<SkillCategory, THREE.Color>();

    layout.orbits.forEach((orbit, index) => {
      const ratio = layout.orbits.length > 1 ? index / (layout.orbits.length - 1) : 0;
      // One hue walked toward the foreground colour rather than five invented
      // ones: the orbits stay distinguishable without leaving the palette.
      map.set(orbit.category, base.clone().lerp(far, ratio * 0.55));
    });

    return map;
  }, [tone, fg, layout.orbits]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    spin.current.dragging = true;
    spin.current.moved = false;
    spin.current.lastX = event.clientX;
    spin.current.velocity = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = spin.current;
    if (!state.dragging) return;

    const dx = event.clientX - state.lastX;
    state.lastX = event.clientX;
    if (Math.abs(dx) > DRAG_THRESHOLD) state.moved = true;

    state.angle += dx * DRAG_RATE;
    // Approximated from the frame's delta rather than measured: pointer events
    // do not arrive on a clock, and a throw only has to feel proportional.
    state.velocity = dx * DRAG_RATE * 30;
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    spin.current.dragging = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  /**
   * One step of the turntable, run from inside the render loop.
   *
   * It lives here, beside the pointer handlers, because this is where the spin
   * ref is declared — the group below only reads the angle it returns. Handing
   * the ref down instead would put a mutation of somebody else's state inside a
   * `useFrame`, which is exactly the shape React's compiler refuses.
   */
  function advanceSpin(delta: number, drift: number): number {
    const state = spin.current;

    if (!state.dragging) {
      if (state.velocity !== 0) {
        state.angle += state.velocity * delta;
        // Frame-rate independent decay: the same glide at 60fps and at 144fps.
        state.velocity *= Math.pow(INERTIA_DECAY, delta);
        if (Math.abs(state.velocity) < 0.002) state.velocity = 0;
      } else {
        state.angle += drift * delta;
      }
    }

    return state.angle;
  }

  function handleSelect(id: string) {
    // A drag that happens to end over a planet is not a click on it.
    if (spin.current.moved) return;
    onSelect(id);
  }

  return (
    <div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      // `pan-y`, not `none`: a horizontal drag turns the galaxy while a vertical
      // one still scrolls the page. Locking both would trap a phone inside the
      // canvas with no way past it.
      style={{ touchAction: "pan-y" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <Canvas
        dpr={[1, budget.maxDpr]}
        // Always while the section is on screen, even under reduced motion: the
        // loop is what answers a drag, a hover and a focus change. What reduced
        // motion removes is everything the scene does *by itself* — see `still`
        // in each component below.
        frameloop={active ? "always" : "demand"}
        camera={{ position: [0, layout.extent * 0.6, layout.extent * 2.1], fov: 45, near: 0.1, far: 200 }}
        gl={{ antialias: budget.tier !== "low", powerPreference: "high-performance" }}
      >
        <fog attach="fog" args={[bg, layout.extent * 1.6, layout.extent * 5]} />

        <ambientLight intensity={0.5} />
        <pointLight position={[0, 0, 0]} intensity={40} distance={layout.extent * 4} color={tone} />
        <directionalLight position={[6, 8, 4]} intensity={0.5} color={fg} />

        <CameraRig
          extent={layout.extent}
          focused={selectedId !== null}
          focus={focus}
          still={still}
        />

        <GalaxyRoot advance={advanceSpin} still={still}>
          <Sun tone={tone} fg={fg} budget={budget} still={still} dim={selectedId !== null} />

          {layout.orbits.map((orbit) => (
            <OrbitRing
              key={orbit.category}
              radius={orbit.radius}
              tilt={orbit.tilt}
              color={palette.get(orbit.category) ?? tone}
              dim={selectedId !== null}
              segments={Math.min(budget.segments * 2, 128)}
            />
          ))}

          {layout.nodes.map((node) => (
            <Planet
              key={node.id}
              node={node}
              color={palette.get(node.category) ?? tone}
              hovered={hoveredId === node.id}
              selected={selectedId === node.id}
              dim={selectedId !== null && selectedId !== node.id}
              // The whole system slows to a crawl while one planet is being
              // read, so the camera is not chasing a moving target.
              rate={still ? 0 : selectedId !== null ? 0.08 : 1}
              sparks={budget.particles > 0 && budget.tier !== "low"}
              focus={focus}
              onHover={onHover}
              onSelect={handleSelect}
            />
          ))}
        </GalaxyRoot>

        {budget.particles > 0 ? (
          <Stars
            radius={layout.extent * 6}
            depth={40}
            count={Math.round(budget.particles * 0.5)}
            factor={3}
            saturation={0}
            fade
            speed={still ? 0 : 0.4}
          />
        ) : null}
      </Canvas>
    </div>
  );
}

/**
 * The turntable everything rides on: drag rotation, inertia and idle drift.
 *
 * Rotation lives on one parent group rather than on each planet, so a drag
 * costs a single matrix update no matter how many worlds the budget allowed.
 */
function GalaxyRoot({
  advance,
  still,
  children,
}: {
  /** Steps the turntable and returns this frame's angle. */
  advance: (delta: number, drift: number) => number;
  still: boolean;
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const pointer = usePointer();

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;

    // No idle drift under reduced motion: a throw still glides to a stop,
    // because that motion was asked for, but nothing turns on its own.
    node.rotation.y = advance(delta, still ? 0 : DRIFT);
    // A slight lean toward the pointer, so the system reads as a solid object
    // in front of you rather than a flat diagram. Held level under reduced
    // motion, where the only thing that should move is what you move.
    const lean = still ? 0.16 : 0.16 + pointer.current.y * 0.12;
    node.rotation.x = THREE.MathUtils.damp(node.rotation.x, lean, 3, delta);
  });

  return <group ref={group}>{children}</group>;
}

/**
 * Camera: parallax around home, or a flight out to the chosen planet.
 *
 * Damped toward a target rather than tweened to it, because the target moves —
 * the selected planet is still drifting along its orbit, slowly, and a tween
 * would arrive somewhere it no longer is.
 */
function CameraRig({
  extent,
  focused,
  focus,
  still,
}: {
  extent: number;
  focused: boolean;
  focus: RefObject<THREE.Vector3>;
  still: boolean;
}) {
  const pointer = usePointer();
  const home = useMemo(
    () => new THREE.Vector3(0, extent * 0.6, extent * 2.1),
    [extent],
  );
  const target = useMemo(() => new THREE.Vector3(), []);
  const look = useRef(new THREE.Vector3(0, 0, 0));
  const wanted = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }, delta) => {
    if (focused) {
      const planet = focus.current;
      // Stand off along the planet's own radius, so the camera ends up outside
      // the system looking in rather than inside the orbit looking across it.
      const distance = Math.max(planet.length(), 0.001);
      target
        .copy(planet)
        .multiplyScalar(1 + 2.6 / distance)
        .add(wanted.set(0, 1, 0));
      look.current.lerp(planet, 1 - Math.pow(0.002, delta));
    } else {
      target.set(
        home.x + (still ? 0 : pointer.current.x * extent * 0.18),
        home.y + (still ? 0 : pointer.current.y * extent * 0.1),
        home.z,
      );
      look.current.lerp(wanted.set(0, 0, 0), 1 - Math.pow(0.002, delta));
    }

    camera.position.lerp(target, 1 - Math.pow(0.004, delta));
    camera.lookAt(look.current);
  });

  return null;
}

/** The star at the centre — the stack itself, with everything in orbit round it. */
function Sun({
  tone,
  fg,
  budget,
  still,
  dim,
}: {
  tone: string;
  fg: string;
  budget: SceneBudget;
  still: boolean;
  dim: boolean;
}) {
  const core = useRef<THREE.Mesh>(null);
  const cage = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const detail = budget.segments >= 96 ? 3 : budget.segments >= 48 ? 2 : 1;

  useFrame(({ clock }, delta) => {
    if (material.current) {
      material.current.opacity = THREE.MathUtils.damp(
        material.current.opacity,
        dim ? 0.12 : 0.5,
        4,
        delta,
      );
    }

    if (still) return;
    if (core.current) core.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.2) * 0.04);
    if (cage.current) {
      cage.current.rotation.y += delta * 0.12;
      cage.current.rotation.x -= delta * 0.05;
    }
  });

  return (
    <group>
      <mesh ref={core}>
        <icosahedronGeometry args={[0.62, detail]} />
        <meshBasicMaterial color={tone} />
      </mesh>
      <mesh ref={cage}>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshBasicMaterial ref={material} color={fg} wireframe transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

/** The thin ring a category's planets travel along. */
function OrbitRing({
  radius,
  tilt,
  color,
  dim,
  segments,
}: {
  radius: number;
  tilt: number;
  color: THREE.Color | string;
  dim: boolean;
  segments: number;
}) {
  const material = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((_, delta) => {
    if (!material.current) return;
    material.current.opacity = THREE.MathUtils.damp(
      material.current.opacity,
      dim ? 0.05 : 0.24,
      4,
      delta,
    );
  });

  return (
    <mesh rotation={[tilt + Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.006, 6, segments]} />
      <meshBasicMaterial ref={material} color={color} transparent opacity={0.24} />
    </mesh>
  );
}

/**
 * One technology.
 *
 * Three things happen to it: it travels its orbit, it grows and brightens under
 * the pointer, and it fades when a different planet has been chosen. All three
 * are damped inside the frame loop rather than driven by React state, so
 * hovering a planet does not re-render thirty siblings.
 */
function Planet({
  node,
  color,
  hovered,
  selected,
  dim,
  rate,
  sparks,
  focus,
  onHover,
  onSelect,
}: {
  node: GalaxyNode;
  color: THREE.Color | string;
  hovered: boolean;
  selected: boolean;
  dim: boolean;
  /** Multiplier on the orbital speed: 0 holds still, 1 is full pace. */
  rate: number;
  sparks: boolean;
  focus: RefObject<THREE.Vector3>;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const pivot = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const angle = useRef(node.angle);

  useFrame((_, delta) => {
    angle.current += node.speed * rate * delta;
    if (pivot.current) pivot.current.rotation.y = angle.current;

    if (mesh.current) {
      const scale = hovered ? 1.55 : selected ? 1.4 : 1;
      const current = mesh.current.scale.x;
      mesh.current.scale.setScalar(THREE.MathUtils.damp(current, scale, 8, delta));
      // The rig reads this next frame at the latest; a planet that is not
      // selected never writes, so there is only ever one author.
      if (selected) mesh.current.getWorldPosition(focus.current);
    }

    if (material.current) {
      material.current.emissiveIntensity = THREE.MathUtils.damp(
        material.current.emissiveIntensity,
        hovered || selected ? 1.5 : dim ? 0.15 : 0.6,
        6,
        delta,
      );
      material.current.opacity = THREE.MathUtils.damp(
        material.current.opacity,
        dim ? 0.28 : 1,
        5,
        delta,
      );
    }
  });

  return (
    <group rotation={[node.tilt, 0, 0]}>
      <group ref={pivot}>
        <group position={[node.radius, node.height, 0]}>
          <mesh
            ref={mesh}
            onPointerOver={(event: ThreeEvent<PointerEvent>) => {
              event.stopPropagation();
              onHover(node.id);
            }}
            onPointerOut={() => onHover(null)}
            onClick={(event: ThreeEvent<MouseEvent>) => {
              event.stopPropagation();
              onSelect(node.id);
            }}
          >
            {/* Low subdivision on purpose: these are small on screen, and the
                facets are what makes them read as crystals rather than dots. */}
            <icosahedronGeometry args={[node.size, 1]} />
            <meshStandardMaterial
              ref={material}
              color={color}
              emissive={color}
              emissiveIntensity={0.6}
              roughness={0.35}
              metalness={0.4}
              flatShading
              transparent
            />
          </mesh>

          {sparks && (hovered || selected) ? <Sparks color={color} size={node.size} /> : null}
        </group>
      </group>
    </group>
  );
}

const SPARK_COUNT = 22;
const SPARK_CYCLE = 1.1;

/**
 * The burst a planet throws off while it is under the pointer.
 *
 * One expanding, fading shell that restarts on a cycle — not a particle system.
 * Nothing here is simulated, so it costs a scale and an opacity per frame, and
 * it disappears entirely on the tiers that cannot spare even that.
 */
function Sparks({ color, size }: { color: THREE.Color | string; size: number }) {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.PointsMaterial>(null);
  const elapsed = useRef(0);

  const positions = useMemo(
    () => sphericalCloud(SPARK_COUNT, { seed: 0xa17e, inner: 0.9, outer: 1.4 }),
    [],
  );

  useFrame((_, delta) => {
    elapsed.current = (elapsed.current + delta) % SPARK_CYCLE;
    const progress = elapsed.current / SPARK_CYCLE;

    if (points.current) points.current.scale.setScalar(size * (1 + progress * 2.2));
    if (material.current) material.current.opacity = (1 - progress) * 0.9;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={material}
        color={color}
        size={0.05}
        sizeAttenuation
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
