"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { HERO_SCULPTURE_RADIUS } from "../../scene/geometry";
import { useHeroComposition, type HeroFormProps, type HeroTemperament } from "./composition";

/**
 * Blueprint — *engineered*. The hero as a drafting view: an unlit wireframe
 * solid inside its own bounding cage, with dimension ticks, drawn on rather
 * than faded in.
 *
 * This is the one scenery specified to have no shaded solids at all
 * (`materials: "unlit"`, `toneMapping: "none"`, `shadowsDisabled`, key light
 * `0.05`), so every material here is `lineBasicMaterial` — nothing in this
 * file responds to a light, which is what makes the declared identity true
 * rather than merely asserted.
 *
 * It also has the least motion of the four by design (Part 13): no idle
 * revolution, no breath. The construction draw runs once, linearly, and after
 * that only scroll moves it.
 */
const TEMPERAMENT: HeroTemperament = {
  idleSpeed: 0,
  breathAmount: 0,
  breathSeconds: 1,
  // The smallest parallax of the four: responsive, never playful.
  maxTilt: THREE.MathUtils.degToRad(3),
  scrollRotation: THREE.MathUtils.degToRad(55),
  // `timescale: 1.25` makes this read quicker still — blueprint is the fast one.
  arriveSeconds: 1.1,
  // The cage's *corner*, not its face: `CAGE × √3`. Measuring the face let
  // the drawing overflow the gutter and clip off the right edge of the page.
  halfExtent: 1.28 * Math.sqrt(3),
};

/** Half-width of the bounding cage — the drafting frame around the subject. */
const CAGE = HERO_SCULPTURE_RADIUS * 1.28;
/** Length of a corner tick, as a fraction of the cage. */
const TICK = 0.22;

/**
 * Corner ticks and a centre cross: the marks that make a wireframe read as a
 * dimensioned drawing rather than as a mesh someone forgot to shade.
 */
function annotationGeometry(): THREE.BufferGeometry {
  const points: number[] = [];
  const t = CAGE * TICK;

  // A tick on each axis at all eight corners of the cage.
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const x = sx * CAGE;
        const y = sy * CAGE;
        const z = sz * CAGE;
        points.push(x, y, z, x - sx * t, y, z);
        points.push(x, y, z, x, y - sy * t, z);
        points.push(x, y, z, x, y, z - sz * t);
      }
    }
  }

  // Centre cross — the drawing's origin mark.
  points.push(-CAGE * 0.18, 0, 0, CAGE * 0.18, 0, 0);
  points.push(0, -CAGE * 0.18, 0, 0, CAGE * 0.18, 0);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  return geometry;
}

/** Rounds to whole line segments so a partial draw never ends mid-segment. */
function drawCount(geometry: THREE.BufferGeometry, progress: number): number {
  const total = geometry.getAttribute("position").count;
  return Math.max(0, Math.floor((total / 2) * THREE.MathUtils.clamp(progress, 0, 1)) * 2);
}

export function DraftingHero(props: HeroFormProps) {
  const { tone, toneSoft, budget } = props;
  const groupRef = useRef<THREE.Group>(null);
  const subjectRef = useRef<THREE.LineSegments>(null);
  const cageRef = useRef<THREE.LineSegments>(null);
  const marksRef = useRef<THREE.LineSegments>(null);
  const materialRefs = useRef<(THREE.LineBasicMaterial | null)[]>([]);

  const subject = useMemo(
    () =>
      new THREE.EdgesGeometry(
        new THREE.IcosahedronGeometry(HERO_SCULPTURE_RADIUS * 0.92, budget.tier === "low" ? 0 : 1),
      ),
    [budget.tier],
  );
  const cage = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(CAGE * 2, CAGE * 2, CAGE * 2)), []);
  const marks = useMemo(() => annotationGeometry(), []);

  useEffect(
    () => () => {
      subject.dispose();
      cage.dispose();
      marks.dispose();
    },
    [subject, cage, marks],
  );

  useHeroComposition(groupRef, props, TEMPERAMENT, (frame) => {
    for (const material of materialRefs.current) {
      if (material) material.opacity = frame.columnPresence;
    }

    // Linear, never eased — a plotter draws at a constant rate, and an
    // ease-out here would read as a bounce (Part 3, blueprint).
    const p = frame.arrive;
    // The cage is struck first, then the subject inside it, then the marks:
    // the order a drafter actually works in, staged across the one shot.
    if (cageRef.current) cageRef.current.geometry.setDrawRange(0, drawCount(cage, p / 0.4));
    if (subjectRef.current) subjectRef.current.geometry.setDrawRange(0, drawCount(subject, (p - 0.25) / 0.55));
    if (marksRef.current) marksRef.current.geometry.setDrawRange(0, drawCount(marks, (p - 0.7) / 0.3));
  });

  return (
    <group ref={groupRef}>
      {/* The bounding cage, drawn faintest — it frames the subject, it is not
          the subject. */}
      <lineSegments ref={cageRef} geometry={cage}>
        <lineBasicMaterial
          ref={(material) => {
            materialRefs.current[0] = material;
          }}
          color={toneSoft}
          transparent
        />
      </lineSegments>

      {/* The subject: an unlit wireframe solid. No fill, by specification. */}
      <lineSegments ref={subjectRef} geometry={subject}>
        <lineBasicMaterial
          ref={(material) => {
            materialRefs.current[1] = material;
          }}
          color={tone}
          transparent
        />
      </lineSegments>

      <lineSegments ref={marksRef} geometry={marks}>
        <lineBasicMaterial
          ref={(material) => {
            materialRefs.current[2] = material;
          }}
          color={tone}
          transparent
        />
      </lineSegments>
    </group>
  );
}
