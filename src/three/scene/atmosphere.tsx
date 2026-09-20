"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { SCENE_SMOOTHING, dampFactor } from "@/lib/experience/scene-motion";
import type { ScenePalette } from "@/lib/experience/scene-palette";

/**
 * Act II's one custom shader (D6), spent on the background rather than on the
 * signature transition.
 *
 * What it replaces: fog alone. Linear fog is a veil — it removes contrast at a
 * distance and nothing else, so the far end of the corridor and the empty top
 * of the frame arrive at exactly the same flat page colour. A room does not
 * look like that. This grades the volume the scene sits in instead: a floor
 * that falls away, an eyeline the fog now genuinely dissolves into, a lift
 * above it, and a soft screen-space vignette that closes the corners so the
 * text column and the focal mass keep the open middle §2 asks for.
 *
 * Why a shader and not a gradient texture or a stack of planes. A gradient
 * this wide and this shallow is exactly where 8-bit output bands, in visible
 * rings across half the viewport; three's own `dithering` chunk breaks that up
 * for a few instructions, and there is no texture to author, load, or keep in
 * step with the palette. It also costs one draw call with no depth write and
 * no second render target, which is the whole argument D5 makes against a post
 * pass.
 *
 * It renders behind everything as a back-faced shell around the world, and it
 * is transparent by design: the page's own ambient CSS background sits at
 * `z-index: -10`, below this canvas, and must still breathe through.
 */

/** Well inside the camera's far plane, well outside anything a section draws. */
const SHELL_RADIUS = 40;

/** How much of the page this layer is allowed to take at its very strongest. */
const OPACITY_DARK = 0.55;
const OPACITY_LIGHT = 0.4;

/** Corner fall-off. Restrained on paper, where a heavy vignette reads as dirt. */
const VIGNETTE_DARK = 0.6;
const VIGNETTE_LIGHT = 0.42;

const VERTEX = /* glsl */ `
  varying vec3 vDirection;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    // Interpolating the view ray across a coarse shell is cheaper than a
    // per-fragment subtraction and indistinguishable at this smoothness.
    vDirection = world.xyz - cameraPosition;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uHorizon;
  uniform vec3 uDeep;
  uniform vec3 uLift;
  uniform vec2 uResolution;
  uniform float uOpacity;
  uniform float uVignette;

  varying vec3 vDirection;

  // <common> is not part of a ShaderMaterial's prefix, and the dither chunk is
  // built on rand() from it. (No backticks in here: this is a template literal.)
  #include <common>
  #include <dithering_pars_fragment>

  void main() {
    vec3 direction = normalize(vDirection);

    // Vertical rake. The windows are wide on purpose: the visible frame only
    // spans about +/-0.4 of Y at these focal lengths, so a tight ramp would
    // put the whole gradient off-screen and leave a flat wall on it.
    float floorward = 1.0 - smoothstep(-1.0, 0.0, direction.y);
    vec3 color = mix(uHorizon, uDeep, floorward);
    color = mix(color, uLift, smoothstep(0.0, 0.85, direction.y));

    // Screen space, not view angle: a vignette is a property of the frame, and
    // dotting against the camera axis would make its width depend on the FOV
    // the rig is currently on.
    float radius = length(gl_FragCoord.xy / uResolution - 0.5) * 1.41421356;
    float edge = smoothstep(0.45, 1.0, radius);
    color = mix(color, uDeep, edge * uVignette);

    // Thinnest where the eye is, thickest low and at the corners.
    float weight = uOpacity * (0.42 + 0.58 * max(edge, floorward));

    gl_FragColor = vec4(color, weight);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <dithering_fragment>
  }
`;

/** Avoids an allocation per frame for the drawing-buffer read. */
const scratchSize = new THREE.Vector2();

/**
 * `ShaderMaterial.uniforms` is an open index signature, so every read off it is
 * `IUniform | undefined`. The set is fixed and built ten lines below, so the
 * frame loop names the shape back rather than null-checking six known keys.
 */
interface AtmosphereUniforms {
  uHorizon: { value: THREE.Color };
  uDeep: { value: THREE.Color };
  uLift: { value: THREE.Color };
  uResolution: { value: THREE.Vector2 };
  uOpacity: { value: number };
  uVignette: { value: number };
}

interface SceneAtmosphereProps {
  palette: ScenePalette;
  budget: SceneBudget;
  reducedMotion: boolean;
}

export function SceneAtmosphere({ palette, budget, reducedMotion }: SceneAtmosphereProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  // The uniforms start on placeholders and are snapped on the first frame, so
  // the material is constructed exactly once and a tone change never rebuilds
  // a program mid-scroll.
  const primed = useRef(false);

  const args = useMemo<[THREE.ShaderMaterialParameters]>(
    () => [
      {
        uniforms: {
          uHorizon: { value: new THREE.Color() },
          uDeep: { value: new THREE.Color() },
          uLift: { value: new THREE.Color() },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uOpacity: { value: 0 },
          uVignette: { value: 0 },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        // Behind everything and claiming no depth of its own: opaque geometry
        // has already written the buffer by the time this draws, so the test
        // clips it correctly without it ever occluding anything itself.
        depthWrite: false,
        side: THREE.BackSide,
        dithering: true,
      },
    ],
    [],
  );

  const targets = useMemo(
    () => ({
      horizon: new THREE.Color(palette.horizon),
      // The floor of the stack, and what the corners fall toward.
      deep: new THREE.Color(palette.deep),
      // Above the eyeline the section's own wash is allowed to show, which is
      // the only place the accent enters the background at all.
      lift: new THREE.Color(palette.wash),
      opacity: palette.dark ? OPACITY_DARK : OPACITY_LIGHT,
      vignette: palette.dark ? VIGNETTE_DARK : VIGNETTE_LIGHT,
    }),
    [palette],
  );

  useFrame((state, delta) => {
    const material = materialRef.current;
    if (!material) return;

    const uniforms = material.uniforms as unknown as AtmosphereUniforms;
    state.gl.getDrawingBufferSize(scratchSize);
    uniforms.uResolution.value.copy(scratchSize);

    // A section boundary must not flash the room (§7): colour arrives on the
    // camera's own smoothing rather than switching. Reduced motion has no
    // continuous loop to interpolate in, so it lands directly.
    const factor = !primed.current || reducedMotion ? 1 : dampFactor(SCENE_SMOOTHING.cinematic, delta);
    primed.current = true;

    uniforms.uHorizon.value.lerp(targets.horizon, factor);
    uniforms.uDeep.value.lerp(targets.deep, factor);
    uniforms.uLift.value.lerp(targets.lift, factor);
    uniforms.uOpacity.value += (targets.opacity - uniforms.uOpacity.value) * factor;
    uniforms.uVignette.value += (targets.vignette - uniforms.uVignette.value) * factor;
  });

  // D6's required fallback. `low` keeps the fog-only background it already
  // had: a full-viewport fill is pure fill rate, which is the one thing a
  // phone has least of, and the grading is the first thing a 1x DPR loses.
  if (budget.tier === "low") return null;

  return (
    <mesh renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[SHELL_RADIUS, 32, 24]} />
      <shaderMaterial ref={materialRef} args={args} />
    </mesh>
  );
}
