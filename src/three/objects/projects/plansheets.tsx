"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { contentSafeFraction, gutterPixels } from "@/lib/experience/scene-layout";
import {
  clampDelta,
  damp,
  easeOutCubic,
  type EntranceId,
  entranceStagger,
  SCENE_SMOOTHING,
  springStep,
  stagger,
  type SpringState,
} from "@/lib/experience/scene-motion";
import type { ScenePalette } from "@/lib/experience/scene-palette";
import { scenePointer } from "@/lib/experience/scene-pointer";
import { pickNearest, registerInteractive } from "@/lib/experience/scene-raycaster";
import { sceneScroll } from "@/lib/experience/scene-scroll";
import { useSceneInspectStore } from "@/lib/store/scene-inspect-store";
import type { Project } from "@/lib/types/content";

import { sceneSectionEnvelope } from "../../scene/camera-rig";
import { gridTexture } from "../../scene/geometry";
import { hoveredSlabIndex } from "./hovered";
import { buildSlabs, FAR_DIM, SLAB_HEIGHT, SLAB_WIDTH, WALL_LIMIT } from "./layout";

export interface PlansheetsProps {
  projects: Project[];
  palette: ScenePalette;
  budget: SceneBudget;
  reducedMotion: boolean;
  pointer: { current: { x: number; y: number } };
  /** This section's waypoint index: `entry` opens the deck, `exit` closes it again. */
  sectionIndex: number;
  /** `scenery.entrance` — the world's arrival language, applied to this section's entry ramp. */
  entrance: EntranceId;
}

/** Same screen-space placement contract as `corridor.tsx` — a different vocabulary, not a new one. */
const PANEL_MARGIN = 0.2;
const PANEL_FRAC_MIN = 0.9;
const PANEL_FRAC_MAX = 1.12;
const WALL_MIN_GUTTER = 70;
const WALL_FULL_GUTTER = 150;
const MIN_DEPTH = 1.5;

const TRAVEL_IN = 1.6;
const TRAVEL_OUT = 3;
const EXIT_SPAN = 0.3;

/** How far a raised sheet lifts toward the reader, and how much larger it reads. */
const RAISE_LIFT = 0.5;
const RAISE_SCALE = 0.18;
/**
 * A hovered card nudges its sheet a fraction of a raise and firms its border
 * (Phase L Part 6). Deliberately a fraction: "the reader is reading this one"
 * and "the reader has opened this one" must not look like the same state, and
 * on a drafting board the quieter of the two is a line weight, not a move.
 */
const HOVER_NUDGE = 0.16;
const HOVER_INK = 0.28;

/** Grid backdrop's scroll rate, in UV repeats per second (§4.4). */
const GRID_SCROLL_X = 0.03;
const GRID_SCROLL_Y = 0.018;
const GRID_REPEAT = 3;

/**
 * Blueprint's Projects variant (§4.4, Phase G): the corridor's own
 * `buildSlabs()` layout, redrawn as flat drafting sheets pinned in the page's
 * gutters rather than raked walls. Each sheet is an unlit `EdgesGeometry`
 * border over a scrolling grid backdrop (`gridTexture()`), and the only
 * interaction is a classified click (§6.2, `wasClick` in `scene-pointer.ts`):
 * one raises a sheet, a second click on the *raised* sheet opens Inspect mode
 * (§6.3); a click elsewhere lowers whatever was raised.
 */
export function Plansheets({
  projects,
  palette,
  budget,
  reducedMotion,
  pointer,
  sectionIndex,
  entrance,
}: PlansheetsProps) {
  const ranked = useMemo(() => [...projects].sort((a, b) => a.order - b.order), [projects]);
  const slabs = useMemo(
    () => buildSlabs(ranked, palette, WALL_LIMIT[budget.tier]),
    [ranked, palette, budget.tier],
  );

  const lineColor = useMemo(() => new THREE.Color(palette.accent), [palette.accent]);

  const borderGeometry = useMemo(
    () => new THREE.EdgesGeometry(new THREE.PlaneGeometry(SLAB_WIDTH, SLAB_HEIGHT)),
    [],
  );
  const backdropGeometry = useMemo(() => new THREE.PlaneGeometry(SLAB_WIDTH, SLAB_HEIGHT), []);
  useEffect(() => {
    return () => {
      borderGeometry.dispose();
      backdropGeometry.dispose();
    };
  }, [borderGeometry, backdropGeometry]);

  const texture = gridTexture();
  useEffect(() => {
    texture?.repeat.set(GRID_REPEAT, GRID_REPEAT * (SLAB_HEIGHT / SLAB_WIDTH));
  }, [texture]);

  const rootRef = useRef<THREE.Group>(null);
  const slabRefs = useRef<(THREE.Group | null)[]>([]);
  const liftRefs = useRef<(THREE.Group | null)[]>([]);
  /** The hit target for `pickNearest` (§6.2) — a plane raycasts precisely; the wireframe border does not. */
  const hitMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const borderMaterials = useRef<(THREE.LineBasicMaterial | null)[]>([]);
  const backdropMaterials = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const unregisterRefs = useRef<(() => void)[]>([]);

  const travel = useRef(-TRAVEL_IN);
  const raised = useRef(-1);
  const attention = useRef<number[]>([]);
  const liftSprings = useRef<SpringState[]>([]);
  const lastReleaseStamp = useRef(scenePointer.releaseStamp);
  const gridOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (liftSprings.current.length !== slabs.length) {
      liftSprings.current = slabs.map(() => ({ value: 0, velocity: 0 }));
      attention.current = slabs.map(() => 0);
      if (raised.current >= slabs.length) raised.current = -1;
    }
  }, [slabs]);

  useEffect(() => () => unregisterRefs.current.forEach((unregister) => unregister()), []);

  const enterInspect = useSceneInspectStore((state) => state.enter);

  useFrame((state, rawDelta) => {
    const root = rootRef.current;
    const camera = state.camera;
    if (!root || !(camera instanceof THREE.PerspectiveCamera)) return;
    const delta = clampDelta(rawDelta);

    const { entry: entryProgress, exit: exitProgress } = sceneSectionEnvelope(sceneScroll.progress, sectionIndex);
    // Raw, not smoothstepped: the world's own entrance curve is the only
    // shaping applied to it now (Part 4).
    const opening = reducedMotion ? 1 : entryProgress;
    const ordinaryClose = THREE.MathUtils.smoothstep(
      THREE.MathUtils.clamp(exitProgress / EXIT_SPAN, 0, 1),
      0,
      1,
    );
    const presence = 1 - ordinaryClose;

    // A raise is a reading state, not a stored selection — leaving the section
    // lowers it, on the same `gentle` spring, while the deck can still show it.
    if (presence < 0.5) raised.current = -1;

    root.visible = presence > 0.01 || opening > 0.01;
    if (!root.visible) return;

    const targetTravel = opening * TRAVEL_IN + ordinaryClose * TRAVEL_OUT - TRAVEL_IN;
    travel.current = reducedMotion ? targetTravel : damp(travel.current, targetTravel, SCENE_SMOOTHING.glide, delta);
    root.position.z = travel.current;

    const gutterPx = gutterPixels(state.size.width);
    const allowance = THREE.MathUtils.smoothstep(gutterPx, WALL_MIN_GUTTER, WALL_FULL_GUTTER);
    const wallsOn = allowance > 0.05;

    const safeFrac = contentSafeFraction(state.size.width);
    const halfAtUnit = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
    const panelFrac = THREE.MathUtils.clamp(safeFrac + PANEL_MARGIN, PANEL_FRAC_MIN, PANEL_FRAC_MAX);

    // A classified click (§6.2): raise the sheet under the cursor at release,
    // enter Inspect if it was already raised, or lower everything on a miss.
    if (!reducedMotion && wallsOn && scenePointer.releaseStamp !== lastReleaseStamp.current) {
      lastReleaseStamp.current = scenePointer.releaseStamp;
      if (scenePointer.lastReleaseWasClick && scenePointer.lastReleaseGrabAllowed) {
        const hit = pickNearest(camera, pointer.current);
        const index = hit ? hitMeshRefs.current.indexOf(hit.object as THREE.Mesh) : -1;
        if (index === -1) {
          raised.current = -1;
        } else if (raised.current === index) {
          enterInspect();
        } else {
          raised.current = index;
        }
      }
    }

    if (!reducedMotion) {
      gridOffset.current.x += delta * GRID_SCROLL_X;
      gridOffset.current.y += delta * GRID_SCROLL_Y;
      if (texture) {
        texture.offset.set(gridOffset.current.x, gridOffset.current.y);
        texture.updateMatrix();
      }
    }

    // Blueprint's sheets do not chase the cursor — the ray is consulted only
    // at a classified release, above — so this has no `pick` fallback and
    // answers the hovered card alone (`hovered.ts`).
    const attended = reducedMotion || !wallsOn ? -1 : hoveredSlabIndex(slabs, () => -1);

    slabs.forEach((slab, index) => {
      const group = slabRefs.current[index];
      const lift = liftRefs.current[index];
      const liftSpring = liftSprings.current[index];
      if (!group || !lift || !liftSpring) return;

      group.visible = wallsOn;
      if (!wallsOn) return;

      const wave = reducedMotion ? 1 : entranceStagger(entrance, opening, index, slabs.length);
      const shut = reducedMotion ? ordinaryClose : easeOutCubic(stagger(ordinaryClose, index, slabs.length, 0.5));
      const fade = THREE.MathUtils.clamp(wave * (1 - shut), 0, 1);

      const depth = Math.max(MIN_DEPTH, camera.position.z - (root.position.z + slab.z));
      const halfH = halfAtUnit * depth;
      const halfW = halfH * camera.aspect;
      group.position.set(slab.side * panelFrac * halfW, -slab.side * slab.lift * halfH, slab.z);
      // A small fixed rake toward the centre — enough to read as a placed
      // sheet rather than a billboard, with none of the corridor's raking
      // animation: blueprint's sheets do not open off a wall, they are simply
      // there.
      group.rotation.y = -slab.side * 0.12;

      const isRaised = raised.current === index;
      const noticed = damp(attention.current[index] ?? 0, attended === index ? 1 : 0, SCENE_SMOOTHING.tight, delta);
      attention.current[index] = noticed;
      // `gentle`, not `panel`: at stiffness 180 / damping 24 / mass 1 `panel`
      // has a damping ratio of ~0.89 and is documented as the spring for
      // "panels that overshoot". A drafting sheet that bounces on release
      // makes the one scenery specified as precise read as playful (§4.4), so
      // this takes the vocabulary's one explicitly overshoot-free spring.
      springStep(liftSpring, isRaised ? 1 : 0, "gentle", delta);
      lift.position.z = (liftSpring.value + noticed * HOVER_NUDGE) * RAISE_LIFT;
      group.scale.setScalar(slab.scale * (1 + liftSpring.value * RAISE_SCALE));

      const dim = 1 - index * FAR_DIM;
      const border = borderMaterials.current[index];
      if (border) {
        border.opacity =
          fade * dim * Math.min(1, 0.55 + liftSpring.value * 0.45 + noticed * HOVER_INK);
      }
      const backdrop = backdropMaterials.current[index];
      if (backdrop) backdrop.opacity = fade * dim * (0.14 + liftSpring.value * 0.1);
    });
  });

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
            <mesh
              geometry={backdropGeometry}
              position={[0, 0, -0.01]}
              dispose={null}
              ref={(el) => {
                hitMeshRefs.current[index] = el;
                unregisterRefs.current[index]?.();
                unregisterRefs.current[index] = el ? registerInteractive(el) : () => {};
              }}
            >
              <meshBasicMaterial
                ref={(el) => {
                  backdropMaterials.current[index] = el;
                }}
                map={texture ?? undefined}
                color={lineColor}
                transparent
                opacity={0.14}
                depthWrite={false}
              />
            </mesh>

            <lineSegments geometry={borderGeometry}>
              <lineBasicMaterial
                ref={(el) => {
                  borderMaterials.current[index] = el;
                }}
                color={slab.color.clone().lerp(lineColor, 0.6)}
                transparent
                opacity={0.55}
              />
            </lineSegments>
          </group>
        </group>
      ))}
    </group>
  );
}

