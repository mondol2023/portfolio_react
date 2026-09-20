import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import type { ScenePalette } from "@/lib/experience/scene-palette";
import { sceneTime } from "@/lib/experience/scene-timer";
import type { SceneryDefinition, ThemedIntensity } from "@/lib/experience/scenery";

import { heroShellSpin } from "../objects/hero/composition";

interface SceneLightingProps {
  palette: ScenePalette;
  budget: SceneBudget;
  scenery: SceneryDefinition;
  reducedMotion: boolean;
}

/** The key's rest position — orbited around when `scenery.lights.keyOrbit` is set. */
const KEY_BASE_POSITION = new THREE.Vector3(3.6, 4.4, 4.2);
/**
 * Built once: the axis a moving key turns around (§4.2, §9). Not simply world
 * up — `crossVectors(worldUp, toScene)` gives the horizontal axis perpendicular
 * to both "up" and the key's own direction to the origin, so the orbit sweeps
 * the light across the scene rather than spinning it in place around Y.
 */
const KEY_ORBIT_AXIS = new THREE.Vector3()
  .crossVectors(new THREE.Vector3(0, 1, 0), KEY_BASE_POSITION.clone().negate().normalize())
  .normalize();
const scratchKeyQuaternion = new THREE.Quaternion();
/** The spot's offset from whatever it is aimed at — it tracks the hero's x. */
const SPOT_BASE_X = 2.6;

/**
 * One coherent lighting rig, shared by every section's objects: a soft key
 * from the upper right, a weak tinted fill from behind and below, a rim light
 * in the section accent, and one accent point. Sections change what the light
 * falls on and how strong the tint reads — never how the rig is built —
 * matching the spec's "one coherent global rig," not a per-section relight or
 * a colour cycle.
 *
 * Two things changed once `scene-palette.ts` existed. The rig no longer
 * lights the world with two copies of the same saturated accent (the old
 * `toneSoft` prop was `--tone-soft` with its alpha silently dropped), and it
 * now balances for the theme: a near-white page reflects most of what hits
 * it and needs a strong key with heavy ambient to keep geometry from reading
 * as a dark smudge, while a near-black page needs the opposite — low ambient
 * and a hot rim — or every object dissolves into the background.
 *
 * Phase E (SCENERY_SYSTEM_PLAN.md §4.1, §13): every intensity below now comes
 * from `scenery.lights` instead of a hardcoded ternary, so a later scenery
 * re-times the rig by supplying different data, never a new branch here.
 */
export function SceneLighting({ palette, budget, scenery, reducedMotion }: SceneLightingProps) {
  const { dark } = palette;
  const { lights } = scenery;
  const pick = (themed: ThemedIntensity) => (dark ? themed.dark : themed.light);

  const keyRef = useRef<THREE.DirectionalLight>(null);
  const spotRef = useRef<THREE.SpotLight>(null);
  const spotTargetRef = useRef<THREE.Object3D>(null);

  // `SpotLight.target` defaults to an Object3D that is never added to the
  // scene, so it can only ever sit at the origin. Pointing it at a real,
  // mounted object is what lets the cone follow the hero.
  useEffect(() => {
    const spot = spotRef.current;
    const target = spotTargetRef.current;
    if (spot && target) spot.target = target;
  }, [lights.spot]);

  // A no-op whenever `keyOrbit` is null (every scenery but observatory): one
  // ref check per frame, no allocation. `sceneTime.elapsed` already carries
  // the active scenery's timescale (S6), so the orbit slows with everything
  // else in `garden` and speeds up in `blueprint` for free.
  //
  // Reduced motion holds `restAngle` instead (Part 10). Freezing the orbit is
  // not enough on its own: `frameloop` is `"demand"` there, so an unguarded
  // `elapsed` read does not animate — it teleports the key by however many
  // seconds passed since the last scroll woke the renderer.
  useFrame(() => {
    const orbit = lights.keyOrbit;
    const key = keyRef.current;
    if (orbit && key) {
      const angle = sceneTime.elapsed * orbit.speed;
      scratchKeyQuaternion.setFromAxisAngle(KEY_ORBIT_AXIS, angle);
      key.position.copy(KEY_BASE_POSITION).applyQuaternion(scratchKeyQuaternion);
    }

    // The hero composes into the page's free edge, not at the origin
    // (`heroColumnRightFraction`), and that edge moves with the viewport. A
    // cone left aimed at the origin lights empty space beside it, so the
    // target — and the light with it — track the form's live x.
    const spot = spotRef.current;
    const target = spotTargetRef.current;
    if (spot && target) {
      target.position.x = heroShellSpin.x;
      spot.position.x = SPOT_BASE_X + heroShellSpin.x;
    }
  });

  return (
    <>
      <ambientLight intensity={pick(lights.ambient)} color={palette.wash} />

      {/* Sky/ground bounce so matte surfaces gain form instead of reading flat
          under ambient alone — replaces a third of the old ambient (§4.1). */}
      {lights.hemisphere && (
        <hemisphereLight
          intensity={lights.hemisphere.intensity}
          color={palette.wash}
          groundColor={palette.deep}
        />
      )}

      {/* Key. The only shadow caster, and only where the budget allows one:
          a second render pass per frame buys inter-object shadowing that is
          worth it on a desktop GPU and nowhere else. */}
      <directionalLight
        ref={keyRef}
        position={[KEY_BASE_POSITION.x, KEY_BASE_POSITION.y, KEY_BASE_POSITION.z]}
        intensity={pick(lights.key)}
        color={palette.key}
        castShadow={budget.shadows && !scenery.shadowsDisabled}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={36}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />

      {/* Observatory's cone on the hero form (§4.2, §9): a static light reads
          polished metal as dead metal, so this is the one place besides the
          key that earns an animated/shaped light. It aims at `spotTargetRef`
          below, which tracks the form's live x each frame — the hero composes
          into the page's free right edge, so the origin is the one place it
          is guaranteed not to be. */}
      {lights.spot && (
        <>
          <object3D ref={spotTargetRef} />
          <spotLight
            ref={spotRef}
            position={[SPOT_BASE_X, 3.4, 3.4]}
            angle={0.35}
            penumbra={0.8}
            intensity={pick(lights.spot)}
            color={palette.key}
            distance={12}
            decay={2}
            castShadow={budget.shadows && !scenery.shadowsDisabled}
            shadow-mapSize={[1024, 1024]}
          />
        </>
      )}

      {/* Fill: weak, from the opposite corner, tinted rather than grey so the
          shadow side still belongs to the section rather than going neutral. */}
      <directionalLight position={[-4.5, -1.6, -2.4]} intensity={pick(lights.fill)} color={palette.fill} />

      {/* Rim/back light — what separates a silhouette from the background, and
          the one place the accent is allowed to run at full strength. Carries
          more on a light page than it used to: Projects' corridor panels are
          deliberately darker than the paper behind them, and without a lit
          leading edge a dark slab on near-white is a hole rather than a
          surface. */}
      <directionalLight position={[-1.5, 2.2, -5.5]} intensity={pick(lights.rim)} color={palette.accent} />

      {/* The single accent point, close enough to fall off visibly across a
          section's geometry rather than reading as more ambient. */}
      <pointLight position={[-2, 1, -4]} intensity={pick(lights.point)} color={palette.accent} distance={14} decay={2} />
    </>
  );
}
