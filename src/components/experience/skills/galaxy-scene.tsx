"use client";

import { Stars } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import {
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import * as THREE from "three";

import { SKILL_CATEGORY_TOKENS, SKILL_COLOR_TOKENS } from "@/lib/constants/skill-palette";
import type { SceneBudget } from "@/lib/experience/device-tier";
import { sphericalCloud } from "@/lib/experience/random";
import { useCssColors } from "@/lib/experience/use-css-colors";
import { usePointer } from "@/lib/experience/use-pointer";
import { useSceneBudget } from "@/lib/experience/use-scene-budget";
import type { ProficiencyLevel, SkillCategory } from "@/lib/types/content";

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
 * A planet says what it is twice over, because colour alone is not a language
 * everyone reads: the **hue** is its category (one `--skill-*` token per orbit,
 * shared with the chips in the DOM), and so is the **solid** — a tetrahedron is
 * a language, a cylinder is a database. Layered on top of both is proficiency:
 * a ringed world is an expert one, a caged one is proficient, a wireframe one
 * is still being learned.
 *
 * Every count is the scene budget's. Nothing here picks a number for a phone.
 */

/**
 * `--tone`/`--bg`/`--fg` for the lighting and fog, then one token per skill
 * category. Module-level and built once: `useCssColors` keeps `names` in an
 * effect dependency list, so a fresh array per render would tear down and
 * rebuild its `MutationObserver` every time.
 */
const TOKENS: readonly string[] = ["--tone", "--bg", "--fg", ...SKILL_COLOR_TOKENS];
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

/**
 * Where the DOM should put the skill card, in CSS pixels relative to the stage.
 *
 * Motion values rather than state, and owned by the parent: the card tracks a
 * planet that is still drifting along its orbit, so the position changes every
 * frame and must never re-render anything.
 */
export interface CardAnchorTarget {
  x: MotionValue<number>;
  y: MotionValue<number>;
}

interface GalaxySceneProps {
  layout: GalaxyLayout;
  /** False while the section is off-screen or the tab is hidden. */
  active: boolean;
  /** True under `prefers-reduced-motion`: the system is built, but it holds still. */
  still: boolean;
  selectedId: string | null;
  hoveredId: string | null;
  anchor: CardAnchorTarget;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  /** A click that landed on neither a planet nor a chip — release the focus. */
  onDismiss: () => void;
}

export default function GalaxyScene({
  layout,
  active,
  still,
  selectedId,
  hoveredId,
  anchor,
  onHover,
  onSelect,
  onDismiss,
}: GalaxySceneProps) {
  const budget = useSceneBudget();
  const colors = useCssColors(TOKENS, TONE_SCOPE);

  const tone = colors["--tone"] ?? SAFE.tone;
  const bg = colors["--bg"] ?? SAFE.bg;
  const fg = colors["--fg"] ?? SAFE.fg;

  const spin = useRef<Spin>({ angle: 0, velocity: 0, dragging: false, moved: false, lastX: 0 });
  // Set synchronously inside a planet's own click handler, read and cleared by
  // `handleBackgroundClick` right after — see that function for why the two
  // need to agree on the same click.
  const clickedPlanet = useRef(false);
  // Where the camera is looking when a planet is chosen. The selected planet
  // writes its own world position here each frame, which spares the rig a
  // registry of every mesh in the system.
  const focus = useRef(new THREE.Vector3());

  /** One hue per category, straight out of the stylesheet the chips also read. */
  const palette = useMemo(() => {
    const map = new Map<SkillCategory, THREE.Color>();

    for (const orbit of layout.orbits) {
      const token = SKILL_CATEGORY_TOKENS[orbit.category];
      map.set(orbit.category, new THREE.Color(colors[token] ?? tone));
    }

    return map;
  }, [layout.orbits, colors, tone]);

  /**
   * Each planet's own shade of its category.
   *
   * Walking the hue a little further toward the foreground with each step
   * around a ring keeps neighbours on one orbit tellable apart without
   * inventing a colour that is not in the palette.
   */
  const shades = useMemo(() => {
    const highlight = new THREE.Color(fg);
    const map = new Map<string, THREE.Color>();

    for (const node of layout.nodes) {
      const base = palette.get(node.category) ?? new THREE.Color(tone);
      map.set(node.id, base.clone().lerp(highlight, Math.min(node.variant, 4) * 0.07));
    }

    return map;
  }, [layout.nodes, palette, fg, tone]);

  const chosen = selectedId
    ? (layout.nodes.find((node) => node.id === selectedId) ?? null)
    : null;

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    spin.current.dragging = true;
    spin.current.moved = false;
    spin.current.lastX = event.clientX;
    spin.current.velocity = 0;
    // Capture is *not* taken here. Pointer capture retargets every later event
    // for this pointer — including the `pointerup`/`click` pair a plain tap
    // produces — at this wrapper instead of letting the browser hit-test them
    // against the canvas underneath. R3F's own click detection depends on that
    // native hit test reaching the canvas, so capturing eagerly would make a
    // click on a planet indistinguishable from a click on empty sky: neither
    // would ever reach the mesh. Capture is taken lazily, in `handlePointerMove`,
    // only once the gesture has actually proven itself a drag.
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = spin.current;
    if (!state.dragging) return;

    const dx = event.clientX - state.lastX;
    state.lastX = event.clientX;
    if (!state.moved && Math.abs(dx) > DRAG_THRESHOLD) {
      state.moved = true;
      // Now that this is provably a drag and not a click, claim the pointer so
      // the turntable keeps turning even if it leaves the stage bounds.
      event.currentTarget.setPointerCapture(event.pointerId);
    }

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
    // Claimed before this same native click bubbles from the canvas up to the
    // wrapper below — R3F's mesh handlers run at the canvas, ahead of
    // `handleBackgroundClick`, so this flag is set in time for it to read.
    clickedPlanet.current = true;
    onSelect(id);
  }

  /**
   * A click that reaches the wrapper without a planet having claimed it first
   * landed on empty sky. The canvas produces a native `click` regardless of
   * what — if anything — the raycast hit, and that event bubbles up through
   * this `<div>` the same as any other click on the page, so this single
   * handler covers both "clicked empty space inside the galaxy" and lines up
   * with the outside-click dismissal the parent does for clicks elsewhere on
   * the page entirely.
   */
  function handleBackgroundClick() {
    if (spin.current.moved) return;
    if (clickedPlanet.current) {
      clickedPlanet.current = false;
      return;
    }
    onDismiss();
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
      onClick={handleBackgroundClick}
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

        <CardAnchor
          anchor={anchor}
          focus={focus}
          active={chosen !== null}
          // Clear of the planet *and* of whatever ring or cage it is wearing,
          // so the card never lands on top of the thing it describes.
          lift={chosen ? chosen.size * 2.6 + 0.35 : 0}
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
              color={shades.get(node.id) ?? tone}
              hovered={hoveredId === node.id}
              selected={selectedId === node.id}
              dim={selectedId !== null && selectedId !== node.id}
              // The whole system slows to a crawl while one planet is being
              // read, so the camera is not chasing a moving target.
              rate={still ? 0 : selectedId !== null ? 0.08 : 1}
              detail={budget.segments >= 48 ? 1 : 0}
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

/**
 * Projects the chosen planet into the page, so a DOM card can sit above it.
 *
 * The card itself is HTML — it carries the skill's own copy, and that belongs
 * in the document, not in a texture. All the scene owes it is a point: the
 * world position the selected planet already publishes for the camera, lifted
 * clear of the planet and pushed through the projection matrix into pixels
 * relative to the canvas.
 *
 * Nothing is written while nothing is selected, so the last position survives
 * the card's exit animation instead of snapping to a corner underneath it.
 */
function CardAnchor({
  anchor,
  focus,
  active,
  lift,
}: {
  anchor: CardAnchorTarget;
  focus: RefObject<THREE.Vector3>;
  active: boolean;
  /** World units above the planet the card should point at. */
  lift: number;
}) {
  const point = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, size }) => {
    if (!active) return;

    // `setY` rather than `point.y +=`: the vector came out of a hook call, and
    // React's compiler rejects writing to a property of one of those. A method
    // that happens to do the same thing is fine, and reads no worse.
    point
      .copy(focus.current)
      .setY(focus.current.y + lift)
      .project(camera);

    anchor.x.set((point.x * 0.5 + 0.5) * size.width);
    anchor.y.set((point.y * -0.5 + 0.5) * size.height);
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

/** The thin ring a category's planets travel along, in that category's colour. */
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
      dim ? 0.05 : 0.32,
      4,
      delta,
    );
  });

  return (
    <mesh rotation={[tilt + Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.006, 6, segments]} />
      <meshBasicMaterial ref={material} color={color} transparent opacity={0.32} />
    </mesh>
  );
}

/**
 * The solid a category is made of.
 *
 * Shape is the half of a planet's identity that survives a colourblind viewer,
 * a greyscale print and a dim room, so it carries the same information the hue
 * does rather than decorating it. The choices are meant to be guessable: the
 * sharpest solid for raw languages, a sphere-like icosahedron for the
 * frontend's surfaces, a cylinder for a database, because that is what a
 * database has looked like since long before anyone reading this wrote one.
 *
 * Subdivision stays low on purpose — these are small on screen, and the facets
 * are what make them read as crystals rather than dots.
 */
function PlanetBody({
  category,
  size,
  detail,
}: {
  category: SkillCategory;
  size: number;
  detail: number;
}) {
  switch (category) {
    case "languages":
      return <tetrahedronGeometry args={[size * 1.35, 0]} />;
    case "frontend":
      return <icosahedronGeometry args={[size, detail]} />;
    case "backend":
      return <octahedronGeometry args={[size * 1.2, 0]} />;
    case "database":
      return <cylinderGeometry args={[size * 0.95, size * 0.95, size * 1.3, 14, 1]} />;
    case "tools":
      return <dodecahedronGeometry args={[size * 0.95, 0]} />;
  }
}

/**
 * What a planet wears, and it means one thing: how well the skill is known.
 *
 * An expert technology gets a ring — the detail that makes a planet memorable
 * in every picture of the solar system anyone has seen. A proficient one gets
 * a cage around it. Everything below that wears nothing, so the ornament reads
 * as earned rather than as decoration handed out evenly.
 *
 * Its opacity is damped alongside the planet's, or a dimmed world would keep a
 * fully-lit ring hanging in front of the chosen one.
 */
function Ornament({
  proficiency,
  size,
  color,
  dim,
}: {
  proficiency: ProficiencyLevel | undefined;
  size: number;
  color: THREE.Color | string;
  dim: boolean;
}) {
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const full = proficiency === "expert" ? 0.62 : 0.34;

  useFrame((_, delta) => {
    if (!material.current) return;
    material.current.opacity = THREE.MathUtils.damp(
      material.current.opacity,
      dim ? full * 0.25 : full,
      5,
      delta,
    );
  });

  if (proficiency === "expert") {
    return (
      // Tilted off both axes: a ring seen exactly edge-on for half of every
      // orbit would read as a glitch rather than as a ring.
      <mesh rotation={[Math.PI / 2 - 0.38, 0, 0.4]}>
        <torusGeometry args={[size * 2, size * 0.08, 3, 36]} />
        <meshBasicMaterial
          ref={material}
          color={color}
          transparent
          opacity={0.62}
          depthWrite={false}
        />
      </mesh>
    );
  }

  if (proficiency === "proficient") {
    return (
      <mesh>
        <icosahedronGeometry args={[size * 1.75, 0]} />
        <meshBasicMaterial
          ref={material}
          color={color}
          wireframe
          transparent
          opacity={0.34}
          depthWrite={false}
        />
      </mesh>
    );
  }

  return null;
}

/**
 * One technology.
 *
 * Four things happen to it: it travels its orbit, it tumbles on its own axis at
 * its own rate, it grows and brightens under the pointer, and it fades when a
 * different planet has been chosen. All of them are damped inside the frame
 * loop rather than driven by React state, so hovering a planet does not
 * re-render thirty siblings.
 */
function Planet({
  node,
  color,
  hovered,
  selected,
  dim,
  rate,
  detail,
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
  /** Subdivision level for the solids that take one. */
  detail: number;
  sparks: boolean;
  focus: RefObject<THREE.Vector3>;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const pivot = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const angle = useRef(node.angle);

  // Its own tumble, derived from its slot on the ring and shared with nothing,
  // so a ring of five planets never looks like one object rotating.
  const tumble = 0.14 + (node.variant % 4) * 0.11;

  useFrame((_, delta) => {
    angle.current += node.speed * rate * delta;
    if (pivot.current) pivot.current.rotation.y = angle.current;

    if (mesh.current && rate > 0) {
      mesh.current.rotation.y += tumble * rate * delta;
      mesh.current.rotation.x += tumble * 0.45 * rate * delta;
    }

    if (body.current) {
      const scale = hovered ? 1.55 : selected ? 1.4 : 1;
      const current = body.current.scale.x;
      body.current.scale.setScalar(THREE.MathUtils.damp(current, scale, 8, delta));
      // The rig and the card anchor read this next frame at the latest; a
      // planet that is not selected never writes, so there is only ever one
      // author.
      if (selected) body.current.getWorldPosition(focus.current);
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
          {/* The hover scale rides on this group, so a ringed planet grows with
              its ring; the tumble stays on the mesh, so the ring keeps its
              tilt instead of wobbling with the world inside it. */}
          <group ref={body}>
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
              <PlanetBody category={node.category} size={node.size} detail={detail} />
              <meshStandardMaterial
                ref={material}
                color={color}
                emissive={color}
                emissiveIntensity={0.6}
                roughness={0.35}
                metalness={0.4}
                flatShading
                transparent
                // A skill still being learned is drawn as an outline: the shape
                // is there, the solid is not filled in yet.
                wireframe={node.proficiency === "learning"}
              />
            </mesh>

            <Ornament proficiency={node.proficiency} size={node.size} color={color} dim={dim} />

            {sparks && (hovered || selected) ? <Sparks color={color} size={node.size} /> : null}
          </group>
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
