"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { contentSafeFraction, gutterPixels } from "@/lib/experience/scene-layout";
import { SCENE_SMOOTHING, clampDelta, damp, easeOutCubic, stagger } from "@/lib/experience/scene-motion";
import type { ScenePalette } from "@/lib/experience/scene-palette";
import { sceneScroll } from "@/lib/experience/scene-scroll";
import { signature } from "@/lib/experience/scene-signature";
import { sceneTime } from "@/lib/experience/scene-timer";
import type { Experience } from "@/lib/types/content";

import { sceneSectionEnvelope } from "../scene/camera-rig";
import { roundedSlabGeometry } from "../scene/geometry";

interface ExperienceTimelineProps {
  experiences: Experience[];
  palette: ScenePalette;
  budget: SceneBudget;
  reducedMotion: boolean;
  /** This section's waypoint index: `entry` raises the structure, `exit` flattens it to a line. */
  sectionIndex: number;
}

interface Station {
  experience: Experience;
  /** Depth in the corridor's own frame. Horizontal placement is resolved per frame. */
  z: number;
  /** Uniform size, stepped back on the page's own type ratio. */
  scale: number;
  /** How far the rib rides above the eyeline, as a fraction of viewport half-height. */
  lift: number;
  color: THREE.Color;
  metal: boolean;
}

/**
 * The rate the architecture recedes at, taken from the section's own type
 * scale rather than picked.
 *
 * A role row steps through three sizes — `label-mono` at 0.6875rem, `text-sm`
 * at 0.875rem, `text-xl` at 1.25rem — and the geometric mean of those steps is
 * ≈1.35. That is the ratio each station behind the last is scaled by, so the
 * corridor and the type it frames change size at the same rate instead of at
 * two unrelated ones. `<DepthScale>` couples the DOM half of the same idea.
 */
const TYPE_STEP_MIN_REM = 0.6875;
const TYPE_STEP_MAX_REM = 1.25;
const TYPE_RATIO = Math.pow(TYPE_STEP_MAX_REM / TYPE_STEP_MIN_REM, 1 / 2);

/** A station's pier, in scene units. Fixed proportions — perspective does the receding. */
const PIER_WIDTH = 0.2;
const PIER_HEIGHT = 2.4;
const PIER_DEPTH = 0.18;
/** The rib each station carries inward over the reader. Its length is resolved against the live gutter. */
const RIB_HEIGHT = 0.08;
const RIB_DEPTH = 0.14;
/** How much of the available gutter a rib is allowed to reach across. Never 1: it must not touch the column. */
const RIB_REACH = 0.6;

/** Depth of the nearest station, and the step between successive ones. */
const STATION_FIRST_Z = -0.8;
const STATION_PITCH = 3.1;
/** Nothing is ever placed closer than this, whatever the camera is doing. */
const MIN_DEPTH = 1.5;

/**
 * Where the near station's rib sits above the eyeline, and how fast that
 * offset decays with depth. This is where the corridor's vanishing point comes
 * from: horizontally the piers are pinned into the page's gutters, so it is
 * the ribs converging *downward* toward the eyeline — together with each
 * station being smaller and dimmer than the one in front — that reads as a
 * structure receding rather than a row of objects.
 */
const LIFT_NEAR = 0.3;
const LIFT_FALLOFF = 0.66;
/** How much further into the page colour each successive station sits. */
const FAR_DIM = 0.16;

/** How far outboard of the content edge a pier is pinned, and the band that stays in. */
const PIER_MARGIN = 0.16;
const PIER_FRAC_MIN = 0.9;
const PIER_FRAC_MAX = 1.1;
/**
 * Where the piers stand once the gutter has closed up. Inboard of the screen
 * edge but still outboard of the text column, so §10's "one structure,
 * receding" is something a phone can actually see rather than two slivers.
 */
const PIER_FRAC_TIGHT = 0.96;
/** Gutter width, in CSS pixels, at which the corridor stays shut / opens fully. */
const CORRIDOR_MIN_GUTTER = 70;
const CORRIDOR_FULL_GUTTER = 150;

/** How far the whole structure travels toward the camera across entry and exit. */
const TRAVEL_DISTANCE = 2.4;

/**
 * The corridor's floor and ceiling, and the rate each moves at.
 *
 * Both sit far enough back to be half-dissolved by the fog and travel at a
 * fraction of the stations' own travel, which is the whole job of a background
 * layer: near things sweep past, distant things barely shift. The two rates
 * differ so the plates do not read as one rigid box being slid around.
 */
const PLATE_Z = -12.5;
const PLATE_PARALLAX_CEILING = 0.34;
const PLATE_PARALLAX_FLOOR = 0.22;
/** Distance off the eyeline, as a fraction of viewport half-height — clear of the reading band. */
const PLATE_LIFT = 0.66;
/** Plate size, in multiples of the viewport half-width and in world depth. */
const PLATE_SPAN = 2.8;
const PLATE_DEPTH = 11;

/** Stations a tier will draw. Depth, not headcount, is what makes a corridor read. */
const STATION_LIMIT: Record<SceneBudget["tier"], number> = { low: 2, mid: 3, high: 4 };

function buildStations(experiences: Experience[], palette: ScenePalette, limit: number): Station[] {
  const chosen = [...experiences].sort((a, b) => a.order - b.order).slice(0, limit);
  const span = Math.max(1, chosen.length - 1);

  const base = new THREE.Color(palette.surface);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);

  return chosen.map((experience, index) => {
    const metal = index % 2 === 1;

    // Hue is fixed across the whole rake; only lightness and chroma move.
    // The previous build hashed `employmentType` into a hue offset, which made
    // the section's colour identity depend on which dropdown an editor picked
    // and turned the timeline into the rainbow the direction rules out — the
    // same defect Projects' corridor had and fixed.
    const color = new THREE.Color().setHSL(
      hsl.h,
      THREE.MathUtils.clamp(hsl.s * (metal ? 0.44 : 0.64), 0, 1),
      palette.dark
        ? THREE.MathUtils.lerp(0.26, 0.44, index / span)
        : THREE.MathUtils.lerp(0.33, 0.54, index / span),
    );

    return {
      experience,
      z: STATION_FIRST_Z - index * STATION_PITCH,
      scale: Math.pow(TYPE_RATIO, -index),
      lift: LIFT_NEAR * Math.pow(LIFT_FALLOFF, index),
      color,
      metal,
    };
  });
}

/**
 * Experience as architecture: a structure the camera travels through, rather
 * than a row of markers standing beside a list.
 *
 * Each role is a **station** — two piers in the page's own gutters, each
 * carrying a lit rib that cantilevers inward over the reader, with the role's
 * node on the left pier where the DOM rail already is. Stations repeat away
 * down the corridor on the section's type ratio, their ribs converging toward
 * the eyeline, so what recedes is a rhythm of structural bays. Behind them a
 * floor and a ceiling plate travel at a fraction of the stations' rate, which
 * is what separates "distant architecture" from "objects on the same plane".
 *
 * Placement is in screen space, not world space, for the reason Phase 12
 * established: the canvas is behind an opaque content column, so the only
 * space this scene owns is the gutter either side of it. Each frame the piers
 * are pinned to a fraction of the viewport half-width derived from the live
 * camera, and every rib's reach is measured against the gutter that actually
 * exists at that width — so a rib can never grow into the text. Where the
 * gutter closes up the corridor shortens to a single station standing just
 * inside the screen edges and stops travelling, which is the whole of the
 * mobile treatment.
 *
 * Entry raises the structure: piers grow down from their ribs in a wave that
 * runs away down the corridor, near to far. Exit is the Phase 14 handoff to
 * Contact and keeps its exact windows — the piers lose their height, the ribs
 * reach the full gutter and drop to the eyeline, and what is left is one
 * horizontal line that only then fades. Contact's dodecahedron times its own
 * rise against that flatten, so the numbers here are load-bearing for the
 * boundary, not just for this section.
 */
export function ExperienceTimeline({
  experiences,
  palette,
  budget,
  reducedMotion,
  sectionIndex,
}: ExperienceTimelineProps) {
  const stations = useMemo(
    () => buildStations(experiences, palette, STATION_LIMIT[budget.tier]),
    [experiences, palette, budget.tier],
  );

  // One geometry per shape, shared by every mesh that needs it and disposed by
  // hand — `dispose={null}` on the meshes stops R3F disposing a geometry its
  // siblings still use. The rib and the plates are unit shapes scaled per
  // frame, so they size themselves off the live viewport without rebuilding.
  // The two background plates own their own geometry and material in JSX
  // instead, so nothing here has to be mutated from inside `useFrame`.
  const geometry = useMemo(() => {
    const bevel = Math.max(1, Math.round(budget.segments / 24));
    return {
      pier: roundedSlabGeometry(PIER_WIDTH, PIER_HEIGHT, PIER_DEPTH, 0.045, bevel),
      rib: new THREE.BoxGeometry(1, RIB_HEIGHT, RIB_DEPTH),
      marker: new THREE.OctahedronGeometry(0.11, 0),
    };
  }, [budget.segments]);

  // Materials are built here rather than declared per mesh: a station's two
  // piers are the same surface, and driving one material's opacity per station
  // is both fewer objects and one place to change rather than four refs.
  const materials = useMemo(
    () =>
      stations.map((station) => ({
        pier: new THREE.MeshStandardMaterial({
          color: station.color,
          emissive: palette.accent,
          emissiveIntensity: 0.03,
          metalness: station.metal ? 0.82 : 0.16,
          roughness: station.metal ? 0.3 : 0.64,
          transparent: true,
          opacity: 0,
        }),
        rib: new THREE.MeshStandardMaterial({
          color: palette.accent,
          emissive: palette.accent,
          emissiveIntensity: 0.45,
          metalness: 0.34,
          roughness: 0.38,
          transparent: true,
          opacity: 0,
        }),
        marker: new THREE.MeshStandardMaterial({
          color: palette.accent,
          emissive: palette.accent,
          emissiveIntensity: station.experience.isCurrent ? 0.6 : 0.12,
          metalness: 0.2,
          roughness: 0.32,
          transparent: true,
          opacity: 0,
        }),
      })),
    [stations, palette.accent],
  );

  useEffect(() => {
    return () => {
      for (const shape of Object.values(geometry)) shape.dispose();
    };
  }, [geometry]);

  useEffect(() => {
    return () => {
      for (const set of materials) {
        set.pier.dispose();
        set.rib.dispose();
        set.marker.dispose();
      }
    };
  }, [materials]);

  const rootRef = useRef<THREE.Group>(null);
  // Per side, per station: the group whose origin is the top of the pier,
  // where its rib crosses. Index is `station * 2 + (side === 1 ? 1 : 0)`.
  const sideRefs = useRef<(THREE.Group | null)[]>([]);
  const pierRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ribRefs = useRef<(THREE.Mesh | null)[]>([]);
  const markerRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ceilingRef = useRef<THREE.Mesh>(null);
  const floorRef = useRef<THREE.Mesh>(null);
  const ceilingMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const floorMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  // The rail is held by a wrapping group rather than a ref on `<line>` itself:
  // that intrinsic name also exists as SVG's, and typing a ref against it is
  // a fight with no upside.
  const railRef = useRef<THREE.Group>(null);
  const railAttrRef = useRef<THREE.BufferAttribute>(null);
  const railMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const travelZ = useRef(0);

  // Rewritten every frame: the rail threads the station markers, which move
  // with the viewport, the dolly and the flatten.
  const railPositions = useMemo(
    () => new Float32Array(Math.max(stations.length, 2) * 3),
    [stations.length],
  );

  useFrame((state, rawDelta) => {
    const root = rootRef.current;
    const camera = state.camera;
    if (!root || !(camera instanceof THREE.PerspectiveCamera)) return;
    const delta = clampDelta(rawDelta);

    // Read per frame, not taken as a prop: scroll moves every frame, and
    // re-rendering the canvas at that rate is what `<ScrollPhysics>` avoids.
    const { entry: entryProgress, exit: exitProgress } = sceneSectionEnvelope(
      sceneScroll.progress,
      sectionIndex,
    );

    // §5 beat 4 opens onto a volume "already lit and waiting", so the structure
    // finishes raising behind the covering panel. Outside the moment
    // `signature.commit` is 0 and this is the ordinary entrance.
    const raising = Math.max(
      reducedMotion ? 1 : THREE.MathUtils.smoothstep(entryProgress, 0, 1),
      signature.active ? signature.commit : 0,
    );
    // Phase 14's handoff to Contact, windows unchanged: the structure thins
    // across 0.15–0.85 of the exit and only fades once flat.
    const flatten = reducedMotion ? 0 : THREE.MathUtils.smoothstep(exitProgress, 0.15, 0.85);
    const fadeOut = THREE.MathUtils.smoothstep(exitProgress, 0.85, 1);
    const fade = THREE.MathUtils.smoothstep(entryProgress, 0, 0.3) * (1 - fadeOut);

    // Nothing to draw outside this section's span. The old build never hid
    // itself and stood in frame through Hero, About and Skills.
    root.visible = fade > 0.01;
    if (!root.visible) return;

    // What the page leaves the corridor to stand in, measured this frame.
    const safeFrac = contentSafeFraction(state.size.width);
    const gutterPx = gutterPixels(state.size.width);
    // One number carries the responsive story: a full gutter gets the whole
    // corridor, a closed one gets a single station and no travel.
    const allowance = THREE.MathUtils.smoothstep(gutterPx, CORRIDOR_MIN_GUTTER, CORRIDOR_FULL_GUTTER);
    const open = allowance > 0.05;

    // Entry and exit push the structure the same way — the motion never
    // reverses, it only continues forward through the roles.
    const exitRamp = THREE.MathUtils.smoothstep(exitProgress, 0, 1);
    const targetTravel = (raising + exitRamp) * TRAVEL_DISTANCE * allowance;
    travelZ.current = reducedMotion
      ? targetTravel
      : damp(travelZ.current, targetTravel, SCENE_SMOOTHING.glide, delta);
    root.position.z = travelZ.current;

    const halfAtUnit = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
    const pierFrac = THREE.MathUtils.lerp(
      PIER_FRAC_TIGHT,
      THREE.MathUtils.clamp(safeFrac + PIER_MARGIN, PIER_FRAC_MIN, PIER_FRAC_MAX),
      allowance,
    );
    // The gutter as a fraction of the half-width, which is what a rib may
    // cross. Held open a little once the corridor has shut so the single
    // mobile station still carries a visible rib rather than a stub.
    const gutterFrac = Math.max(1 - safeFrac, 0.08);

    stations.forEach((station, index) => {
      const shown = index === 0 || open;
      const depth = Math.max(MIN_DEPTH, camera.position.z - (root.position.z + station.z));
      const halfH = halfAtUnit * depth;
      const halfW = halfH * camera.aspect;

      // The wave runs away down the corridor on entry, so the bay you are
      // standing in raises first and the far end arrives last.
      const wave = reducedMotion ? 1 : easeOutCubic(stagger(raising, index, stations.length, 0.5));
      // Height is what the flatten takes: piers hang from their ribs and lose
      // that hang entirely, leaving the ribs as one line at the eyeline.
      const standing = wave * (1 - flatten);
      const ribY = station.lift * halfH * (1 - flatten);
      const ribLength = THREE.MathUtils.lerp(RIB_REACH, 1, flatten) * gutterFrac * halfW * wave;

      const dim = 1 - index * FAR_DIM;
      const set = materials[index];
      if (set) {
        set.pier.opacity = fade * dim * standing;
        // The line of light holds further into the distance than the mass
        // does — a corridor reads by its edges — and it is the only thing
        // left once the structure has flattened.
        set.rib.opacity = fade * THREE.MathUtils.lerp(dim, 1, 0.5);
        set.rib.emissiveIntensity = (0.45 + flatten * 0.5) * dim;
        set.marker.opacity = fade * dim * (1 - flatten);
      }

      for (const side of [-1, 1] as const) {
        const slot = index * 2 + (side === 1 ? 1 : 0);
        const group = sideRefs.current[slot];
        if (!group) continue;

        group.visible = shown;
        if (!shown) continue;

        group.position.set(side * pierFrac * halfW, ribY, station.z);
        group.scale.setScalar(station.scale);

        const pier = pierRefs.current[slot];
        if (pier) {
          // Scaled about its own top, so it shortens upward into the rib
          // rather than shrinking toward a point in mid-air.
          pier.scale.y = Math.max(standing, 0.001);
          pier.position.y = (-PIER_HEIGHT / 2) * pier.scale.y;
        }

        const rib = ribRefs.current[slot];
        if (rib) {
          // Local x is scaled, not the group, so the rib's thickness stays
          // even while its reach changes. It cantilevers inward only.
          const length = Math.max(ribLength / station.scale, 0.001);
          rib.scale.x = length;
          rib.position.x = -side * length * 0.5;
        }
      }

      // The node, on the left pier where the DOM rail already runs.
      const marker = markerRefs.current[index];
      if (marker) {
        marker.visible = shown;
        marker.position.set(-pierFrac * halfW + gutterFrac * halfW * 0.14, ribY, station.z);
        const breathe =
          reducedMotion || !station.experience.isCurrent
            ? 1
            : 1 + Math.sin(sceneTime.elapsed * 1.6) * 0.14;
        marker.scale.setScalar(station.scale * breathe);
      }

      const offset = index * 3;
      railPositions[offset] = -pierFrac * halfW + gutterFrac * halfW * 0.14;
      railPositions[offset + 1] = ribY;
      railPositions[offset + 2] = station.z;
    });

    // The rail threading the markers — the 3D rhyme of the DOM timeline's own
    // left-hand rail. Only meaningful once there is more than one station.
    const rail = railRef.current;
    if (rail) {
      rail.visible = open && stations.length > 1;
      if (rail.visible) {
        if (railAttrRef.current) railAttrRef.current.needsUpdate = true;
        if (railMaterialRef.current) railMaterialRef.current.opacity = fade * 0.32;
      }
    }

    // Floor and ceiling: the volume the stations stand in. Each is offset
    // *backward* by the share of travel it is not supposed to take, so its
    // world position advances at `PLATE_PARALLAX` of the corridor's rate.
    const plateDepth = Math.max(MIN_DEPTH, camera.position.z - (root.position.z + PLATE_Z));
    const plateHalfH = halfAtUnit * plateDepth;
    const plateHalfW = plateHalfH * camera.aspect;
    const plateOpacity = fade * (palette.dark ? 0.3 : 0.16) * (1 - flatten);
    if (ceilingMaterialRef.current) ceilingMaterialRef.current.opacity = plateOpacity;
    if (floorMaterialRef.current) floorMaterialRef.current.opacity = plateOpacity;

    const ceiling = ceilingRef.current;
    if (ceiling) {
      ceiling.position.set(
        0,
        PLATE_LIFT * plateHalfH,
        PLATE_Z - travelZ.current * (1 - PLATE_PARALLAX_CEILING),
      );
      ceiling.scale.set(PLATE_SPAN * plateHalfW, PLATE_DEPTH, 1);
    }
    const floor = floorRef.current;
    if (floor) {
      floor.position.set(
        0,
        -PLATE_LIFT * plateHalfH,
        PLATE_Z - travelZ.current * (1 - PLATE_PARALLAX_FLOOR),
      );
      floor.scale.set(PLATE_SPAN * plateHalfW, PLATE_DEPTH, 1);
    }
  });

  if (stations.length === 0) return null;

  // Darker than the page in light mode, lighter in dark: the plates read as
  // the surfaces of the corridor, not as a fog laid over it.
  const plateColor = palette.dark ? palette.surface : palette.deep;

  return (
    <group ref={rootRef}>
      {stations.map((station, index) => (
        <group key={station.experience.id}>
          {([-1, 1] as const).map((side) => {
            const slot = index * 2 + (side === 1 ? 1 : 0);
            return (
              <group
                key={side}
                ref={(el) => {
                  sideRefs.current[slot] = el;
                }}
              >
                {/* The pier. Matte on every other station, metal between —
                    which keeps the section near the 70/20/10 material mix. */}
                <mesh
                  geometry={geometry.pier}
                  material={materials[index]?.pier}
                  dispose={null}
                  castShadow={budget.shadows}
                  receiveShadow={budget.shadows}
                />
                {/* The rib: the one emissive accent per pier, and the only
                    thing still standing once the structure has flattened. */}
                <mesh geometry={geometry.rib} material={materials[index]?.rib} dispose={null} />
              </group>
            );
          })}

          <mesh
            geometry={geometry.marker}
            material={materials[index]?.marker}
            dispose={null}
            ref={(el) => {
              markerRefs.current[index] = el;
            }}
          />
        </group>
      ))}

      {/* Threads the station markers down the corridor. */}
      <group ref={railRef}>
        <line>
          <bufferGeometry>
            <bufferAttribute ref={railAttrRef} attach="attributes-position" args={[railPositions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial ref={railMaterialRef} color={palette.wash} transparent opacity={0} />
        </line>
      </group>

      {/* The background layers. Skipped on `low`, where two more full-width
          transparent surfaces buy less than they cost. */}
      {budget.tier !== "low" ? (
        <>
          <mesh ref={ceilingRef} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial
              ref={ceilingMaterialRef}
              color={plateColor}
              metalness={0.1}
              roughness={0.9}
              transparent
              opacity={0}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh ref={floorRef} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial
              ref={floorMaterialRef}
              color={plateColor}
              metalness={0.1}
              roughness={0.9}
              transparent
              opacity={0}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </>
      ) : null}
    </group>
  );
}
