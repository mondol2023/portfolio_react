"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { seededRandom } from "@/lib/experience/random";
import { contentSafeFraction, gutterPixels } from "@/lib/experience/scene-layout";
import type { ScenePalette } from "@/lib/experience/scene-palette";
import {
  SCENE_SMOOTHING,
  clampDelta,
  damp,
  easeOutCubic,
  type EntranceId,
  entranceStagger,
  springStep,
  stagger,
  type SpringState,
} from "@/lib/experience/scene-motion";
import { sceneScroll } from "@/lib/experience/scene-scroll";
import { signature } from "@/lib/experience/scene-signature";
import { sceneTime } from "@/lib/experience/scene-timer";
import type { Project } from "@/lib/types/content";

import { sceneSectionEnvelope } from "../../scene/camera-rig";
import { glowTexture, roundedSlabGeometry } from "../../scene/geometry";
import { hoveredSlabIndex } from "./hovered";
import { buildSlabs, CLOSED_STEP, FAR_DIM, SLAB_DEPTH, SLAB_HEIGHT, SLAB_WIDTH, WALL_LIMIT } from "./layout";

export interface CorridorProps {
  projects: Project[];
  palette: ScenePalette;
  budget: SceneBudget;
  reducedMotion: boolean;
  pointer: { current: { x: number; y: number } };
  /** This section's waypoint index: `entry` opens the corridor, `exit` closes it again. */
  sectionIndex: number;
  /** `scenery.entrance` — the world's arrival language, applied to this section's entry ramp. */
  entrance: EntranceId;
}

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

/* ── The signature moment (§5). Nothing below runs outside its window. ────── */

/** Where the committed wall stands: arm's length, filling the frame — beat 2. */
const COVER_DEPTH = 1.5;
/**
 * How much more than the frame it covers — generous, because the camera is
 * still taking parallax and a sliver of Experience past the edge gives it away.
 */
const COVER_FRAC = 1.45;
/** What is left of a corridor panel by the time it has been folded into the wall's edge. */
const CONVERGE_SCALE = 0.25;
/** How far the corridor's dim takes the other panels toward `palette.deep`. */
const VEIL_DEPTH = 0.85;

/** Tiles the wall breaks into. `low` never shatters; it dissolves instead. */
const SHARD_GRID: Record<SceneBudget["tier"], readonly [number, number]> = {
  low: [0, 0],
  mid: [4, 3],
  high: [5, 4],
};
/** Spread as a fraction of the wall, and flight distance toward the reader. */
const SHARD_SPREAD = 0.55;
const SHARD_FLY = 3;
const SHARD_SPIN = THREE.MathUtils.degToRad(34);
/** Slight overlap, so no seams show before the break opens. */
const SHARD_OVERLAP = 1.02;

const scratchProjected = new THREE.Vector3();
const scratchShardMatrix = new THREE.Matrix4();
const scratchShardPosition = new THREE.Vector3();
const scratchShardScale = new THREE.Vector3();
const scratchShardQuaternion = new THREE.Quaternion();
const scratchShardEuler = new THREE.Euler();

/** 0 before `from`, 1 after `to` — one beat of the entrance, read off the shared ramp. */
function phase(t: number, from: number, to: number): number {
  return THREE.MathUtils.clamp((t - from) / (to - from), 0, 1);
}

interface Shard {
  /** Cell centre in the wall's own rect, -0.5..0.5. */
  u: number;
  v: number;
  /** Flight rate. Above 1 leaves early — the middle of the wall comes at the reader first. */
  lead: number;
  /** Tumble axis weights, seeded so the break is the same one every time. */
  spin: readonly [number, number, number];
}

/**
 * Built from the tier's grid, not scattered: a surface breaking apart has to
 * have been one surface first.
 */
function buildShards(tier: SceneBudget["tier"]): Shard[] {
  const [cols, rows] = SHARD_GRID[tier];
  if (cols === 0 || rows === 0) return [];

  const random = seededRandom(97);
  const shards: Shard[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const u = (col + 0.5) / cols - 0.5;
      const v = (row + 0.5) / rows - 0.5;
      shards.push({
        u,
        v,
        lead: 1.35 - (Math.hypot(u, v) / 0.71) * 0.45,
        spin: [(random() - 0.5) * 2, (random() - 0.5) * 2, (random() - 0.5) * 2],
      });
    }
  }

  return shards;
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
export function Corridor({
  projects,
  palette,
  budget,
  reducedMotion,
  pointer,
  sectionIndex,
  entrance,
}: CorridorProps) {
  const ranked = useMemo(() => [...projects].sort((a, b) => a.order - b.order), [projects]);
  const lead = ranked[0];
  const slabs = useMemo(
    () => buildSlabs(ranked.slice(1), palette, WALL_LIMIT[budget.tier]),
    [ranked, palette, budget.tier],
  );
  const shards = useMemo(() => buildShards(budget.tier), [budget.tier]);

  // What the other panels dim toward during the moment's approach (§5 beat 1).
  const deepColor = useMemo(() => new THREE.Color(palette.deep), [palette.deep]);

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
  const shardRef = useRef<THREE.InstancedMesh>(null);
  const shardMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const glowMaterial = useRef<THREE.SpriteMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const travel = useRef(-TRAVEL_IN);
  const hover = useRef<number[]>([]);
  const tiltX = useRef<SpringState>({ value: 0, velocity: 0 });
  const tiltY = useRef<SpringState>({ value: 0, velocity: 0 });
  // Face colours are mutated in place while dimmed; this says whether they
  // still need putting back once the moment has passed.
  const veiled = useRef(false);

  // A fresh projects fetch changes the slab count — resize the per-slab
  // scratch state so stale entries never linger past a re-render.
  if (hover.current.length !== slabs.length) {
    hover.current = slabs.map(() => 0);
  }

  useFrame((state, rawDelta) => {
    const root = rootRef.current;
    const camera = state.camera;
    if (!root || !(camera instanceof THREE.PerspectiveCamera)) return;
    const delta = clampDelta(rawDelta);
    const time = sceneTime.elapsed;

    // Read per frame, not taken as a prop: scroll moves every frame, and
    // re-rendering the canvas at that rate is what `<ScrollPhysics>` avoids.
    const { entry: entryProgress, exit: exitProgress } = sceneSectionEnvelope(sceneScroll.progress, sectionIndex);

    const opening = reducedMotion ? 1 : THREE.MathUtils.smoothstep(entryProgress, 0, 1);

    // How much of the boundary the signature moment owns (§5). At zero — off,
    // out of window, reduced motion — everything below collapses to its
    // pre-moment behaviour exactly.
    const takeover = signature.active ? signature.takeover : 0;
    const commit = signature.active ? signature.commit : 0;
    const veil = signature.active ? signature.dim : 0;
    const stillness = signature.active ? signature.hold : 0;
    const breakOut = signature.active && signature.shatter ? signature.release : 0;

    const ordinaryClose = THREE.MathUtils.smoothstep(
      THREE.MathUtils.clamp(exitProgress / EXIT_SPAN, 0, 1),
      0,
      1,
    );
    // The moment replaces the ordinary shutter: the corridor is not switched
    // off, it is folded into the wall, and only then does it go.
    const closing = THREE.MathUtils.lerp(
      ordinaryClose,
      THREE.MathUtils.smoothstep(commit, 0.72, 1),
      takeover,
    );
    const presence = 1 - closing;
    // Opaque well before the panels finish opening, so the wave of light is
    // seen at full strength rather than through a fade.
    const entered = THREE.MathUtils.smoothstep(entryProgress, 0, 0.3);
    const fade = entered * presence;
    // The wall outlives the corridor — it only goes when its surface breaks.
    const faceBreak = THREE.MathUtils.smoothstep(breakOut, 0.05, 0.45);
    const wallFade = THREE.MathUtils.lerp(fade, entered * (1 - faceBreak), takeover);

    // Nothing to draw outside this section's span — skipping the subtree is
    // cheaper than drawing a corridor faded to nothing.
    root.visible = fade > 0.01 || wallFade > 0.01 || takeover > 0.01;
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
    // as walking out the far end. During the moment the corridor holds where
    // it arrived and the camera does the travelling instead — two systems
    // moving the same distance at once would read as neither.
    const targetTravel = THREE.MathUtils.lerp(
      depthIn * TRAVEL_IN + ordinaryClose * TRAVEL_OUT - TRAVEL_IN,
      depthIn * TRAVEL_IN - TRAVEL_IN,
      takeover,
    );
    travel.current = reducedMotion
      ? targetTravel
      : damp(travel.current, targetTravel, SCENE_SMOOTHING.glide, delta);
    root.position.z = travel.current;

    // What the page leaves the corridor to stand in, measured this frame.
    const safeFrac = contentSafeFraction(state.size.width);
    const gutterPx = gutterPixels(state.size.width);
    // One number carries the whole responsive story: how far the walls are
    // allowed to open. Full gutter, full rake; a narrow one and they stay
    // nearly flush, showing only their line of light; none and they are not
    // drawn at all.
    const allowance = THREE.MathUtils.smoothstep(gutterPx, WALL_MIN_GUTTER, WALL_FULL_GUTTER);
    const wallsOn = allowance > 0.05;

    const halfAtUnit = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
    const panelFrac = THREE.MathUtils.clamp(safeFrac + PANEL_MARGIN, PANEL_FRAC_MIN, PANEL_FRAC_MAX);

    // Placed before the panels, because the panels collapse into it. At rest it
    // is the corridor's far end; committed, it stands at arm's length sized from
    // the *live* camera distance — the only way "fills the frame" stays true
    // while the camera is still pushing in underneath it.
    const restBack = (1 - markerIn) * PORTAL_APPROACH + ordinaryClose * PORTAL_RECEDE * (1 - takeover);
    const coverLocalZ = camera.position.z - root.position.z - COVER_DEPTH;
    const wallLocalZ = THREE.MathUtils.lerp(LEAD_Z - restBack, coverLocalZ, commit);
    const wallHalfH = halfAtUnit * THREE.MathUtils.lerp(LEAD_DEPTH, COVER_DEPTH, commit);
    const wallHalfW = wallHalfH * camera.aspect;
    const wallSpanX = THREE.MathUtils.lerp(PORTAL_FRAC, COVER_FRAC, commit) * wallHalfW;
    const wallSpanY = THREE.MathUtils.lerp(PORTAL_HEIGHT, COVER_FRAC, commit) * wallHalfH;
    const wallY = THREE.MathUtils.lerp(PORTAL_CENTRE * wallHalfH, 0, commit);
    // Panels are inside the wall's edge well before it has finished growing,
    // so they never have to cross the camera plane to get there.
    const converge = THREE.MathUtils.smoothstep(commit, 0, 0.9) * takeover;

    // Which slab is attended to. The hovered DOM card wins outright; only
    // with no card under the cursor does this fall back to whichever slab the
    // cursor is nearest in screen space — see `hovered.ts` for why that order
    // and not the other one.
    let nearest = -1;
    if (!reducedMotion && wallsOn) {
      nearest = hoveredSlabIndex(slabs, () => {
        let nearestDistance = HOVER_RADIUS;
        let found = -1;
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
            found = index;
          }
        });
        return found;
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
      const wave = reducedMotion ? 1 : entranceStagger(entrance, panelsIn, index, slabs.length);
      const shut = reducedMotion ? closing : easeOutCubic(stagger(closing, index, slabs.length, 0.5));
      const openness = THREE.MathUtils.clamp(wave * (1 - shut), 0, 1) * allowance;

      const hovered = hover.current[index] ?? 0;
      const next = damp(hovered, nearest === index ? 1 : 0, SCENE_SMOOTHING.tight, delta);
      hover.current[index] = next;

      // The hold beat is stillness: a room that keeps breathing never reads
      // as held.
      const breath = reducedMotion
        ? 0
        : Math.sin(time * IDLE_SPEED + index * 1.7) * IDLE_SWING * settleIn * presence * (1 - stillness);

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

      // §5 beat 2 — the rails converge on the wall's edges. Blended over the
      // placement above, so panels leave from where the layout actually put them.
      if (converge > 0) {
        group.position.x = THREE.MathUtils.lerp(group.position.x, slab.side * wallSpanX * 0.92, converge);
        group.position.y = THREE.MathUtils.lerp(group.position.y, wallY, converge);
        group.position.z = THREE.MathUtils.lerp(slab.z, wallLocalZ, converge);
        group.scale.setScalar(THREE.MathUtils.lerp(slab.scale, slab.scale * CONVERGE_SCALE, converge));
      }

      // Local +Z is the panel's own face normal, so this lifts it off the
      // wall no matter which way the panel is currently turned.
      lift.position.z = next * HOVER_LIFT;

      const dim = 1 - index * FAR_DIM;
      const face = faceMaterials.current[index];
      if (face) {
        face.opacity = fade * dim;
        face.emissiveIntensity = (0.04 + next * 0.18) * (1 - veil);
        // Toward `palette.deep`, not toward the page: on a light background
        // fading out reads as disappearing, not as the gallery going dark.
        if (veil > 0.001 || veiled.current) face.color.copy(slab.color).lerp(deepColor, veil * VEIL_DEPTH);
      }
      const edge = edgeMaterials.current[index];
      if (edge) {
        // The line of light holds on further into the distance than the face
        // does — a corridor reads by its edges.
        edge.opacity = fade * THREE.MathUtils.lerp(dim, 1, 0.5);
        edge.emissiveIntensity = (0.5 + next * 1.5) * dim * (1 - veil * 0.9);
      }
    });

    veiled.current = veil > 0.001;

    const portal = portalRef.current;
    if (portal) {
      // Establishes early by coming forward out of the fog, and withdraws on
      // the way out rather than being cut — the corridor is left behind, not
      // switched off. Under the moment it does neither: it comes to meet the
      // reader instead (placement resolved above, with the panels').
      portal.position.set(0, wallY, wallLocalZ);

      portalFaceRef.current?.scale.set(wallSpanX * 2, wallSpanY * 2, 1);
      portalEdgeRef.current?.scale.set(
        wallSpanX * 2 + PORTAL_EDGE * 2,
        wallSpanY * 2 + PORTAL_EDGE * 2,
        1,
      );
      glowRef.current?.position.set(0, wallSpanY, 0.12);
      glowRef.current?.scale.set(wallSpanX * 1.6, wallSpanY * 1.1, 1);

      const faceMaterial = portalFaceMaterial.current;
      if (faceMaterial) {
        faceMaterial.opacity = wallFade * THREE.MathUtils.lerp(0.5, 1, markerIn);
        faceMaterial.emissiveIntensity = 0.02 + settleIn * 0.06;
      }
      const edgeMaterial = portalEdgeMaterial.current;
      if (edgeMaterial) {
        edgeMaterial.opacity = wallFade * markerIn;
        // Fog takes nearly half of this away at the wall's depth, which is the
        // point — what is left is a line, not a glare.
        edgeMaterial.emissiveIntensity = 0.45 + settleIn * 0.9;
      }
      if (glowMaterial.current) {
        // The glow marks the wall's top edge; once it is the frame, there is none.
        glowMaterial.current.opacity =
          fade * settleIn * (palette.dark ? 0.4 : 0.2) * (1 - commit);
      }

      // §5 beat 4: the surface breaks outward past the camera. The tiles are
      // laid out exactly over the face they replace, so the swap at the top of
      // the beat happens while the two are coincident and cannot be seen. They
      // exist only here — outside the release the mesh is not drawn at all.
      const shardMesh = shardRef.current;
      if (shardMesh) {
        shardMesh.visible = breakOut > 0.001 && shards.length > 0;
        if (shardMesh.visible) {
          const cellX = ((wallSpanX * 2) / SHARD_GRID[budget.tier][0]) * SHARD_OVERLAP;
          const cellY = ((wallSpanY * 2) / SHARD_GRID[budget.tier][1]) * SHARD_OVERLAP;

          shards.forEach((shard, index) => {
            const flight = easeOutCubic(THREE.MathUtils.clamp(breakOut * shard.lead, 0, 1));
            const spread = 1 + flight * SHARD_SPREAD;
            scratchShardPosition.set(
              shard.u * wallSpanX * 2 * spread,
              shard.v * wallSpanY * 2 * spread,
              flight * SHARD_FLY,
            );
            scratchShardEuler.set(
              shard.spin[0] * flight * SHARD_SPIN,
              shard.spin[1] * flight * SHARD_SPIN,
              shard.spin[2] * flight * SHARD_SPIN,
            );
            scratchShardQuaternion.setFromEuler(scratchShardEuler);
            scratchShardScale.set(cellX, cellY, 1);
            scratchShardMatrix.compose(
              scratchShardPosition,
              scratchShardQuaternion,
              scratchShardScale,
            );
            shardMesh.setMatrixAt(index, scratchShardMatrix);
          });

          shardMesh.instanceMatrix.needsUpdate = true;
          if (shardMaterial.current) {
            // Held opaque while they are still in front of the reader; gone by
            // the time the camera has released backward into the new volume.
            shardMaterial.current.opacity = entered * (1 - THREE.MathUtils.smoothstep(breakOut, 0.62, 1));
          }
        }
      }
    }

    if (lightRef.current) {
      // Comes up last and barely moves afterwards: a five-percent breath on an
      // eighteen-second period, which is felt as the room being alive rather
      // than seen as an animation.
      const pulse = reducedMotion
        ? 0
        : Math.sin(time * IDLE_SPEED * 0.55) * 0.05 * settleIn * presence * (1 - stillness);
      // The gallery's light travels with the wall it exists to graze, so the
      // committed panel is lit rather than left as a silhouette.
      lightRef.current.position.z = THREE.MathUtils.lerp(LEAD_Z + 3, wallLocalZ + 2.2, commit);
      lightRef.current.intensity =
        wallFade * (0.35 + settleIn * 0.65) * (palette.dark ? 2.8 : 1.7) * (1 + pulse);
    }

    // Cursor sway on a real spring — it overshoots and settles, which a lerp
    // cannot do. Snapped flat under reduced motion, same as every other
    // pointer-driven behaviour in this scene.
    if (reducedMotion) {
      tiltX.current = { value: 0, velocity: 0 };
      tiltY.current = { value: 0, velocity: 0 };
    } else {
      // Pulled to centre through the hold: beat 3 is one beat of quiet, and a
      // room that still sways with the cursor is not quiet.
      const sway = 1 - stillness;
      springStep(tiltX.current, THREE.MathUtils.clamp(-pointer.current.y, -1, 1) * MAX_TILT_X * sway, "panel", delta);
      springStep(tiltY.current, THREE.MathUtils.clamp(pointer.current.x, -1, 1) * MAX_TILT_Y * sway, "panel", delta);
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

        {/* The same surface, in pieces. One draw call, laid out over the face
            it replaces and only drawn during the break, so the section's
            resting composition and its draw-call count are both unchanged.
            Frustum culling is off because the instances leave the base
            geometry's bounds entirely on their way past the camera. */}
        {shards.length > 0 ? (
          <instancedMesh
            ref={shardRef}
            args={[undefined, undefined, shards.length]}
            geometry={geometry.portal}
            frustumCulled={false}
            visible={false}
            dispose={null}
          >
            <meshStandardMaterial
              ref={shardMaterial}
              color={portalColor}
              emissive={palette.accent}
              emissiveIntensity={0.06}
              metalness={0.25}
              roughness={0.72}
              side={THREE.DoubleSide}
              transparent
              opacity={0}
            />
          </instancedMesh>
        ) : null}

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
