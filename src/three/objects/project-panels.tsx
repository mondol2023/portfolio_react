"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { seededRandom } from "@/lib/experience/random";
import type { ScenePalette } from "@/lib/experience/scene-palette";
import {
  SCENE_SMOOTHING,
  damp,
  easeOutCubic,
  springStep,
  stagger,
  type SpringState,
} from "@/lib/experience/scene-motion";
import type { Project } from "@/lib/types/content";

import { glowTexture, roundedSlabGeometry } from "../scene/geometry";

interface ProjectPanelsProps {
  projects: Project[];
  palette: ScenePalette;
  budget: SceneBudget;
  reducedMotion: boolean;
  pointer: { current: { x: number; y: number } };
  /** 0 at rest in Skills, 1 once the camera has fully arrived at Projects. */
  entryProgress: number;
  /** 0 while resident in Projects, 1 once the camera has moved on toward Experience. */
  exitProgress: number;
}

interface WallSlab {
  project: Project;
  /** -1 mounts on the left wall, +1 on the right. */
  side: 1 | -1;
  /** Depth in the corridor's own frame. Screen placement is resolved per frame. */
  z: number;
  /** Distance off the eyeline as a fraction of the viewport half-height — converges with depth. */
  lift: number;
  /** Size relative to the nearest panel. */
  scale: number;
  /** Yaw when the panel is open — angled off its wall, raking toward the camera. */
  open: number;
  /** Yaw when flush with its wall: edge-on to the camera, a lit sliver and nothing more. */
  closed: number;
  color: THREE.Color;
  metal: boolean;
}

/** Slab face, in metres-ish scene units. */
const SLAB_WIDTH = 1.9;
const SLAB_HEIGHT = 1.25;
const SLAB_DEPTH = 0.08;

/** Depth of the nearest slab, and the step between successive ones. */
const WALL_FIRST_Z = -0.6;
const WALL_PITCH = 2.8;

/**
 * How far the near panel rides off the eyeline, and how fast that offset
 * decays with depth. This is where the corridor's vanishing point actually
 * comes from: horizontally the panels are pinned into the page's gutters (see
 * `panelFrac` below), so it is the *vertical* convergence toward the eyeline —
 * together with each panel being smaller, lighter and dimmer than the one in
 * front of it — that reads as receding space.
 */
const LIFT_NEAR = 0.34;
const LIFT_FALLOFF = 0.62;
/** Each panel is a little smaller than the one in front, on top of perspective. */
const SCALE_FALLOFF = 0.06;
/** How much further into the fog each successive panel sits. */
const FAR_DIM = 0.13;

/** How far off its wall an open panel rakes. Enough to catch the key light, never enough to face front. */
const TOE_IN = THREE.MathUtils.degToRad(52);
const FLUSH = Math.PI / 2;
/** A closed panel also sits further out, so opening reads as stepping off the wall. */
const CLOSED_STEP = 0.3;

/**
 * The page's own measurements, which the corridor has to compose around.
 *
 * The DOM project grid is opaque and the canvas sits behind it at `z-index:
 * -8`, so every part of this scene that lands inside the content column is
 * simply not in the composition. `CONTENT_MAX_PX` is the `container-page`
 * max-width and `CONTENT_PAD_PX` its inner padding; together they give the
 * fraction of the viewport half-width the cards occupy, and therefore the
 * gutter the corridor gets to stand in.
 */
const CONTENT_MAX_PX = 1216;
const CONTENT_PAD_PX = 40;
/** How far outboard of the content edge a panel's centre is pinned. */
const PANEL_MARGIN = 0.2;
const PANEL_FRAC_MIN = 0.9;
const PANEL_FRAC_MAX = 1.12;
/** Gutter width, in CSS pixels, at which the walls stay shut / open fully. */
const WALL_MIN_GUTTER = 70;
const WALL_FULL_GUTTER = 150;

/**
 * The lead project: the wall the corridor ends in.
 *
 * Not a monolith floating at the centre of the frame — that space belongs to
 * the cards, and anything opaque parked behind the section's heading and
 * standfirst fights the text for contrast. This is a broad, low architectural
 * mass across the far end instead: its top edge carries the one strong
 * emissive line in the section, and at rest that line sits *below* the top of
 * the card grid, so centrally the wall is hidden and what the reader sees is
 * the lit edge crossing the gutters behind the panels. Arriving and leaving —
 * when the content column has not yet filled the frame — the whole wall reads,
 * which is what makes the section feel like somewhere you enter and leave.
 */
const LEAD_Z = -10.5;
/**
 * Nominal camera distance to that wall, from the Projects waypoint. Its size
 * is derived per frame from live fov and aspect but this *fixed* depth, so the
 * corridor's dolly shows up as the wall growing and receding rather than being
 * silently rescaled to a constant screen size.
 */
const LEAD_DEPTH = 15.6;
const PORTAL_FRAC = 1.1;
const PORTAL_HEIGHT = 0.74;
const PORTAL_CENTRE = -0.3;
/** World-space thickness of the wall's lit edge — added, not scaled, so it stays even. */
const PORTAL_EDGE = 0.14;
/** How far back the wall starts, and how far it withdraws on the way out. */
const PORTAL_APPROACH = 2.2;
const PORTAL_RECEDE = 3.6;

/** The corridor's approach across the entry span, and its continued glide across the exit. */
const TRAVEL_IN = 2.6;
const TRAVEL_OUT = 5;
/**
 * How much of the exit span the corridor takes to clear out. The shared
 * envelope spreads an exit across the whole span to the next waypoint, which
 * here would leave panels still standing over the first screen of Experience;
 * a third of it puts the corridor away before that section's content arrives.
 */
const EXIT_SPAN = 0.3;

/** Nothing is ever placed closer than this, whatever the camera is doing. */
const MIN_DEPTH = 1.5;

/**
 * Whole-corridor cursor sway. Well under the spec's ±4°/±6° card cap on
 * purpose: this rotation pivots geometry ten units deep, where three degrees
 * already swings the far end half a unit sideways. The cap is a limit on how
 * much a surface *moves*, not a quota to spend.
 */
const MAX_TILT_X = THREE.MathUtils.degToRad(2);
const MAX_TILT_Y = THREE.MathUtils.degToRad(3);

/** Cursor distance, in normalised device coords, within which a panel responds. */
const HOVER_RADIUS = 0.22;
const HOVER_LIFT = 0.24;
const HOVER_TURN = THREE.MathUtils.degToRad(8);

/**
 * Idle life, and the whole of it: a breath under a degree, on a period long
 * enough (~18s) that it is felt rather than watched. Everything else in the
 * section is still once the entrance has settled.
 */
const IDLE_SPEED = 0.34;
const IDLE_SWING = THREE.MathUtils.degToRad(0.7);

/** Wall panels a tier will draw. Depth, not headcount, is what makes the corridor read. */
const WALL_LIMIT: Record<SceneBudget["tier"], number> = { low: 2, mid: 3, high: 4 };

const scratchProjected = new THREE.Vector3();

/** 0 before `from`, 1 after `to` — one beat of the entrance, read off the shared ramp. */
function phase(t: number, from: number, to: number): number {
  return THREE.MathUtils.clamp((t - from) / (to - from), 0, 1);
}

function buildSlabs(projects: Project[], palette: ScenePalette, limit: number): WallSlab[] {
  const random = seededRandom(41);
  const base = new THREE.Color(palette.surface);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);

  const chosen = projects.slice(0, limit);
  const span = Math.max(1, chosen.length - 1);

  return chosen.map((project, index) => {
    const side: 1 | -1 = index % 2 === 0 ? -1 : 1;
    const metal = index % 3 === 1;

    // Every panel stays inside the section's own hue: lightness and chroma
    // vary, the hue never does. The previous build hashed `project.type` into
    // an arbitrary hue offset, which turned the deck into exactly the rainbow
    // the brief rules out — and meant the section's colour identity changed
    // whenever an editor retyped a project's category.
    //
    // The lightness ramp is what gives the corridor its near-to-far read: the
    // panel nearest the camera is the darkest and most present against a
    // near-white page, and each one behind it steps lighter, meeting the fog
    // rather than fighting it.
    const color = new THREE.Color().setHSL(
      hsl.h,
      THREE.MathUtils.clamp(hsl.s * (metal ? 0.46 : 0.66), 0, 1),
      palette.dark
        ? THREE.MathUtils.lerp(0.24, 0.42, index / span)
        : THREE.MathUtils.lerp(0.31, 0.52, index / span),
    );

    return {
      project,
      side,
      z: WALL_FIRST_Z - index * WALL_PITCH,
      lift: LIFT_NEAR * Math.pow(LIFT_FALLOFF, index) + (random() - 0.5) * 0.03,
      scale: 1 - index * SCALE_FALLOFF,
      open: -side * TOE_IN,
      closed: -side * FLUSH,
      color,
      metal,
    };
  });
}

/**
 * Projects' identity per the spec — the "show-stopper" section, as a gallery
 * corridor the reader walks down while the cards stay in front of them.
 *
 * The composition is dictated by one fact about the page: the DOM grid is
 * opaque and the canvas is behind it, so the only space this scene actually
 * owns is the gutter either side of the 76rem content column — 152px a side at
 * 1440, and none at all below about 1300. Everything here is therefore placed
 * in *screen* space rather than world space: each frame the panels are pinned
 * to a fraction of the viewport half-width derived from the live camera, so
 * they sit in that gutter at every window size, and the corridor's dolly moves
 * them nearer instead of sweeping them sideways across the heading. Where the
 * gutter closes up — tablet widths and below — the walls shut flush and then
 * stop drawing altogether, which is the whole of the mobile treatment: the
 * same corridor with less of it, not a second composition.
 *
 * Depth comes from the vertical convergence toward the eyeline, each panel
 * being smaller, lighter and dimmer than the one in front of it, and the fog
 * they recede into. The lead project is the wall at the far end, and its lit
 * top edge is the line the corridor leads to.
 *
 * The authored moment is still the panels opening. At rest each slab lies
 * flush with its wall — edge-on, nothing visible but the strip of light along
 * its leading edge — and as the camera arrives they rake off the wall in
 * sequence, near to far, a wave of light turning into surfaces. Leaving runs
 * the same wave in the same order while the corridor keeps gliding forward and
 * the far wall withdraws, so the section closes behind you rather than being
 * switched off.
 *
 * Interaction is per panel, not per deck: the cursor's nearest slab lifts off
 * its wall, turns a few more degrees toward the viewer, and brightens its
 * edge — resolved by projecting each slab to screen space, the same contract
 * Skills' galaxy uses, since a `pointer-events-none` canvas can never raycast.
 * The whole corridor also sways on a real damped spring reusing `SPRING.panel`,
 * so it settles with a touch of genuine overshoot. Both are pointer-reactive
 * rather than ambient, so both are skipped entirely under reduced motion.
 */
export function ProjectPanels({
  projects,
  palette,
  budget,
  reducedMotion,
  pointer,
  entryProgress,
  exitProgress,
}: ProjectPanelsProps) {
  const ranked = useMemo(() => [...projects].sort((a, b) => a.order - b.order), [projects]);
  const lead = ranked[0];
  const slabs = useMemo(
    () => buildSlabs(ranked.slice(1), palette, WALL_LIMIT[budget.tier]),
    [ranked, palette, budget.tier],
  );

  // The far wall has to read against the page rather than sink into it: a
  // silhouette on a light page, a lit mass on a dark one.
  const portalColor = palette.dark ? palette.surface : palette.deep;

  // One geometry per shape, shared by every mesh that needs it, and disposed
  // by hand — `dispose={null}` on the meshes stops R3F disposing a geometry
  // that its siblings are still using. The wall and its edge are unit planes
  // scaled per frame, so the corridor's end is sized from the live viewport
  // without rebuilding geometry on resize.
  const geometry = useMemo(() => {
    const bevel = Math.max(1, Math.round(budget.segments / 24));
    return {
      slab: roundedSlabGeometry(SLAB_WIDTH, SLAB_HEIGHT, SLAB_DEPTH, 0.07, bevel),
      edge: new THREE.BoxGeometry(0.05, SLAB_HEIGHT * 0.92, 0.11),
      portal: new THREE.PlaneGeometry(1, 1),
      marker: new THREE.OctahedronGeometry(0.06, 0),
    };
  }, [budget.segments]);

  useEffect(() => {
    return () => {
      for (const shape of Object.values(geometry)) shape.dispose();
    };
  }, [geometry]);

  const rootRef = useRef<THREE.Group>(null);
  const slabRefs = useRef<(THREE.Group | null)[]>([]);
  const liftRefs = useRef<(THREE.Group | null)[]>([]);
  const faceMaterials = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const edgeMaterials = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const portalRef = useRef<THREE.Group>(null);
  const portalFaceRef = useRef<THREE.Mesh>(null);
  const portalEdgeRef = useRef<THREE.Mesh>(null);
  const portalFaceMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const portalEdgeMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const glowMaterial = useRef<THREE.SpriteMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const travel = useRef(-TRAVEL_IN);
  const hover = useRef<number[]>([]);
  const tiltX = useRef<SpringState>({ value: 0, velocity: 0 });
  const tiltY = useRef<SpringState>({ value: 0, velocity: 0 });

  // A fresh projects fetch changes the slab count — resize the per-slab
  // scratch state so stale entries never linger past a re-render.
  if (hover.current.length !== slabs.length) {
    hover.current = slabs.map(() => 0);
  }

  useFrame((state, rawDelta) => {
    const root = rootRef.current;
    const camera = state.camera;
    if (!root || !(camera instanceof THREE.PerspectiveCamera)) return;
    const delta = Math.min(rawDelta, 1 / 30);
    const time = state.clock.elapsedTime;

    const opening = reducedMotion ? 1 : THREE.MathUtils.smoothstep(entryProgress, 0, 1);
    const closing = THREE.MathUtils.smoothstep(
      THREE.MathUtils.clamp(exitProgress / EXIT_SPAN, 0, 1),
      0,
      1,
    );
    const presence = 1 - closing;
    // Opaque well before the panels finish opening, so the wave of light is
    // seen at full strength rather than through a fade.
    const fade = THREE.MathUtils.smoothstep(entryProgress, 0, 0.3) * presence;

    // Nothing to draw outside this section's span — skipping the subtree is
    // cheaper than drawing a corridor faded to nothing.
    root.visible = fade > 0.01;
    if (!root.visible) return;

    // The entrance in beats, all read off the same ramp so they cannot drift
    // apart: the corridor arrives, the far wall establishes itself, the panels
    // open near to far, and the light settles last. Past ~0.8 of the ramp
    // nothing is still moving, which is the plateau.
    const depthIn = easeOutCubic(phase(opening, 0, 0.62));
    const markerIn = easeOutCubic(phase(opening, 0.16, 0.74));
    const panelsIn = phase(opening, 0.3, 1);
    const settleIn = phase(opening, 0.55, 1);

    // Entry brings the corridor forward to its resting depth; exit keeps it
    // moving the same way rather than reversing, so leaving the section reads
    // as walking out the far end.
    const targetTravel = depthIn * TRAVEL_IN + closing * TRAVEL_OUT - TRAVEL_IN;
    travel.current = reducedMotion
      ? targetTravel
      : damp(travel.current, targetTravel, SCENE_SMOOTHING.glide, delta);
    root.position.z = travel.current;

    // What the page leaves the corridor to stand in, measured this frame.
    const halfPx = Math.max(1, state.size.width / 2);
    const contentHalfPx =
      Math.min(halfPx, CONTENT_MAX_PX / 2) - Math.min(CONTENT_PAD_PX, state.size.width * 0.05);
    const safeFrac = THREE.MathUtils.clamp(contentHalfPx / halfPx, 0.4, 1);
    const gutterPx = (1 - safeFrac) * halfPx;
    // One number carries the whole responsive story: how far the walls are
    // allowed to open. Full gutter, full rake; a narrow one and they stay
    // nearly flush, showing only their line of light; none and they are not
    // drawn at all.
    const allowance = THREE.MathUtils.smoothstep(gutterPx, WALL_MIN_GUTTER, WALL_FULL_GUTTER);
    const wallsOn = allowance > 0.05;

    const halfAtUnit = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
    const panelFrac = THREE.MathUtils.clamp(safeFrac + PANEL_MARGIN, PANEL_FRAC_MIN, PANEL_FRAC_MAX);

    // Whichever slab the cursor is nearest, resolved in screen space once per
    // frame — a canvas behind `pointer-events-none` content can never raycast.
    let nearest = -1;
    if (!reducedMotion && wallsOn) {
      let nearestDistance = HOVER_RADIUS;
      slabs.forEach((_slab, index) => {
        const group = slabRefs.current[index];
        if (!group) return;
        group.getWorldPosition(scratchProjected).project(camera);
        if (scratchProjected.z > 1) return;
        const dx = scratchProjected.x - pointer.current.x;
        const dy = scratchProjected.y - pointer.current.y;
        const distance = Math.hypot(dx, dy);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = index;
        }
      });
    }

    slabs.forEach((slab, index) => {
      const group = slabRefs.current[index];
      const lift = liftRefs.current[index];
      if (!group || !lift) return;

      group.visible = wallsOn;
      if (!wallsOn) return;

      // Near panels open first and the wave runs away down the corridor; the
      // exit runs the same order, so the panel you have just passed is the
      // first to close behind you.
      const wave = reducedMotion ? 1 : easeOutCubic(stagger(panelsIn, index, slabs.length, 0.5));
      const shut = reducedMotion ? closing : easeOutCubic(stagger(closing, index, slabs.length, 0.5));
      const openness = THREE.MathUtils.clamp(wave * (1 - shut), 0, 1) * allowance;

      const hovered = hover.current[index] ?? 0;
      const next = damp(hovered, nearest === index ? 1 : 0, SCENE_SMOOTHING.tight, delta);
      hover.current[index] = next;

      const breath = reducedMotion
        ? 0
        : Math.sin(time * IDLE_SPEED + index * 1.7) * IDLE_SWING * settleIn * presence;

      const yaw =
        THREE.MathUtils.lerp(slab.closed, slab.open, openness) -
        slab.side * (next * HOVER_TURN + breath);
      group.rotation.y = yaw;

      // Placement in screen space: the panel's centre is pinned to a fraction
      // of the viewport half-width at its own depth, so it holds its column in
      // the page's gutter no matter the window size, the lens, or where the
      // corridor currently is in its dolly.
      const depth = Math.max(MIN_DEPTH, camera.position.z - (root.position.z + slab.z));
      const halfH = halfAtUnit * depth;
      const halfW = halfH * camera.aspect;
      group.position.set(
        slab.side * (panelFrac * halfW + (1 - openness) * CLOSED_STEP),
        -slab.side * slab.lift * halfH,
        slab.z,
      );
      group.scale.setScalar(slab.scale);
      // Local +Z is the panel's own face normal, so this lifts it off the
      // wall no matter which way the panel is currently turned.
      lift.position.z = next * HOVER_LIFT;

      const dim = 1 - index * FAR_DIM;
      const face = faceMaterials.current[index];
      if (face) {
        face.opacity = fade * dim;
        face.emissiveIntensity = 0.04 + next * 0.18;
      }
      const edge = edgeMaterials.current[index];
      if (edge) {
        // The line of light holds on further into the distance than the face
        // does — a corridor reads by its edges.
        edge.opacity = fade * THREE.MathUtils.lerp(dim, 1, 0.5);
        edge.emissiveIntensity = (0.5 + next * 1.5) * dim;
      }
    });

    const portal = portalRef.current;
    if (portal) {
      const halfH = halfAtUnit * LEAD_DEPTH;
      const halfW = halfH * camera.aspect;
      const spanX = PORTAL_FRAC * halfW;
      const spanY = PORTAL_HEIGHT * halfH;

      // Establishes early by coming forward out of the fog, and withdraws on
      // the way out rather than being cut — the corridor is left behind, not
      // switched off.
      const back = (1 - markerIn) * PORTAL_APPROACH + closing * PORTAL_RECEDE;
      portal.position.set(0, PORTAL_CENTRE * halfH, LEAD_Z - back);

      portalFaceRef.current?.scale.set(spanX * 2, spanY * 2, 1);
      portalEdgeRef.current?.scale.set(spanX * 2 + PORTAL_EDGE * 2, spanY * 2 + PORTAL_EDGE * 2, 1);
      glowRef.current?.position.set(0, spanY, 0.12);
      glowRef.current?.scale.set(spanX * 1.6, spanY * 1.1, 1);

      const faceMaterial = portalFaceMaterial.current;
      if (faceMaterial) {
        faceMaterial.opacity = fade * THREE.MathUtils.lerp(0.5, 1, markerIn);
        faceMaterial.emissiveIntensity = 0.02 + settleIn * 0.06;
      }
      const edgeMaterial = portalEdgeMaterial.current;
      if (edgeMaterial) {
        edgeMaterial.opacity = fade * markerIn;
        // Fog takes nearly half of this away at the wall's depth, which is the
        // point — what is left is a line, not a glare.
        edgeMaterial.emissiveIntensity = 0.45 + settleIn * 0.9;
      }
      if (glowMaterial.current) {
        glowMaterial.current.opacity = fade * settleIn * (palette.dark ? 0.4 : 0.2);
      }
    }

    if (lightRef.current) {
      // Comes up last and barely moves afterwards: a five-percent breath on an
      // eighteen-second period, which is felt as the room being alive rather
      // than seen as an animation.
      const pulse = reducedMotion ? 0 : Math.sin(time * IDLE_SPEED * 0.55) * 0.05 * settleIn * presence;
      lightRef.current.intensity =
        fade * (0.35 + settleIn * 0.65) * (palette.dark ? 2.8 : 1.7) * (1 + pulse);
    }

    // Cursor sway on a real spring — it overshoots and settles, which a lerp
    // cannot do. Snapped flat under reduced motion, same as every other
    // pointer-driven behaviour in this scene.
    if (reducedMotion) {
      tiltX.current = { value: 0, velocity: 0 };
      tiltY.current = { value: 0, velocity: 0 };
    } else {
      springStep(tiltX.current, THREE.MathUtils.clamp(-pointer.current.y, -1, 1) * MAX_TILT_X, "panel", delta);
      springStep(tiltY.current, THREE.MathUtils.clamp(pointer.current.x, -1, 1) * MAX_TILT_Y, "panel", delta);
    }
    root.rotation.x = tiltX.current.value;
    root.rotation.y = tiltY.current.value;
  });

  if (!lead) return null;

  return (
    <group ref={rootRef}>
      {slabs.map((slab, index) => (
        <group
          key={slab.project.id}
          ref={(el) => {
            slabRefs.current[index] = el;
          }}
        >
          <group
            ref={(el) => {
              liftRefs.current[index] = el;
            }}
          >
            {/* The panel itself: matte by default, metal on every third, which
                keeps the section near the brief's 70/20/10 material mix. */}
            <mesh geometry={geometry.slab} dispose={null} castShadow={budget.shadows} receiveShadow={budget.shadows}>
              <meshStandardMaterial
                ref={(el) => {
                  faceMaterials.current[index] = el;
                }}
                color={slab.color}
                emissive={palette.accent}
                emissiveIntensity={0.04}
                metalness={slab.metal ? 0.85 : 0.15}
                roughness={slab.metal ? 0.28 : 0.62}
                transparent
                opacity={0}
              />
            </mesh>

            {/* Leading edge. The one emissive accent per panel, and the only
                thing visible while the panel is still flush with its wall —
                so a closed corridor reads as a receding line of light. */}
            <mesh
              geometry={geometry.edge}
              position={[slab.side * (SLAB_WIDTH / 2 - 0.02), 0, 0.03]}
              dispose={null}
            >
              <meshStandardMaterial
                ref={(el) => {
                  edgeMaterials.current[index] = el;
                }}
                color={palette.accent}
                emissive={palette.accent}
                emissiveIntensity={0.5}
                metalness={0.3}
                roughness={0.35}
                transparent
                opacity={0}
              />
            </mesh>

            {slab.project.featured ? (
              <mesh
                geometry={geometry.marker}
                position={[slab.side * -0.7, SLAB_HEIGHT / 2 + 0.12, 0.04]}
                dispose={null}
              >
                <meshStandardMaterial
                  color={palette.accent}
                  emissive={palette.accent}
                  emissiveIntensity={1.1}
                  metalness={0.2}
                  roughness={0.3}
                />
              </mesh>
            ) : null}
          </group>
        </group>
      ))}

      {/* The lead project as the wall the corridor ends in. Two unit planes
          sized per frame — the mass, and an accent plate behind it grown by a
          fixed world-space margin, so the visible border stays an even line
          rather than stretching with the wall. */}
      <group ref={portalRef} position={[0, 0, LEAD_Z]}>
        <mesh ref={portalEdgeRef} geometry={geometry.portal} position={[0, 0, -0.06]} dispose={null}>
          <meshStandardMaterial
            ref={portalEdgeMaterial}
            color={palette.accent}
            emissive={palette.accent}
            emissiveIntensity={0.45}
            metalness={0.4}
            roughness={0.4}
            transparent
            opacity={0}
          />
        </mesh>
        <mesh ref={portalFaceRef} geometry={geometry.portal} dispose={null}>
          <meshStandardMaterial
            ref={portalFaceMaterial}
            color={portalColor}
            emissive={palette.accent}
            emissiveIntensity={0.02}
            metalness={0.25}
            roughness={0.72}
            transparent
            opacity={0}
          />
        </mesh>

        {/* Stands in for a bloom pass: one sprite along the wall's lit edge, no
            second full-screen render and no new dependency. Composited
            normally on a light page, where adding light to near-white just
            erases it. */}
        {budget.tier !== "low" && glowTexture() ? (
          <sprite ref={glowRef}>
            <spriteMaterial
              ref={glowMaterial}
              map={glowTexture()}
              color={palette.accent}
              transparent
              opacity={0}
              depthWrite={false}
              blending={palette.dark ? THREE.AdditiveBlending : THREE.NormalBlending}
            />
          </sprite>
        ) : null}
      </group>

      {/* The gallery's own light, down at the far end — it grazes the inner
          faces of both walls and throws the end wall into relief. Travels
          with the corridor, and fades out with it, so the global rig in
          `lighting.tsx` stays one rig rather than gaining a section variant. */}
      <pointLight
        ref={lightRef}
        position={[0, 0.2, LEAD_Z + 3]}
        intensity={0}
        color={palette.accent}
        distance={16}
        decay={2}
      />
    </group>
  );
}
