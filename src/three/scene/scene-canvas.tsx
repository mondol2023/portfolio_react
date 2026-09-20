"use client";

import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SRGBColorSpace } from "three";

import { budgetFor, stepDownTier, type SceneBudget } from "@/lib/experience/device-tier";
import { applyScenerySkin, buildScenePalette } from "@/lib/experience/scene-palette";
import type { SceneryDefinition } from "@/lib/experience/scenery";
import { setSceneTimescale } from "@/lib/experience/scene-timer";
import { usePointer } from "@/lib/experience/use-pointer";
import { usePointerPress } from "@/lib/experience/use-pointer-press";
import { useFinePointer } from "@/lib/hooks/use-media-query";
import { useSceneContentStore } from "@/lib/store/scene-content-store";
import { useSceneInspectStore } from "@/lib/store/scene-inspect-store";
import { AboutScene } from "@/three/sections/about-scene";
import { ContactScene } from "@/three/sections/contact-scene";
import { ExperienceScene } from "@/three/sections/experience-scene";
import { HeroScene } from "@/three/sections/hero-scene";
import { ProjectsScene } from "@/three/sections/projects-scene";
import { SkillsScene } from "@/three/sections/skills-scene";

import { CameraRig } from "./camera-rig";
import { Drifters } from "./drifters";
import { SceneEnvironment } from "./environment";
import { FpsMonitor } from "./fps-monitor";
import { InspectControls } from "./inspect-controls";
import { SceneLighting } from "./lighting";
import { configureSceneLoaders } from "./loaders";
import { ScrollPhysics } from "./scroll-physics";
import { SignatureMoment } from "./signature-moment";
import { resolveToneMapping } from "./tone-mapping";

// Module-scope, not inside the component: this file only evaluates once the
// `next/dynamic` chunk loads, which is before any child can call
// `useGLTF`/`useSceneKTX2` — the same "run once, before first use" guarantee
// a call inside the component body would need an effect to fake.
configureSceneLoaders();

interface SceneCanvasProps {
  active: boolean;
  reducedMotion: boolean;
  budget: SceneBudget;
  /** The current section's resolved `--tone`. */
  tone: string;
  /** The theme's resolved `--bg` — what the scene's atmosphere and depth fade toward. */
  background: string;
  /** The "three-particles" switch — gates `SceneEnvironment`'s dust field only. */
  particlesEnabled: boolean;
  /** The "three-camera-scroll" switch — gates `CameraRig`'s dolly only. */
  cameraScrollEnabled: boolean;
  /** The "three-signature" switch — gates the Projects → Experience set piece only. */
  signatureEnabled: boolean;
  /** The "three-drifters" switch — gates the draggable foreground layer only. */
  driftersEnabled: boolean;
  /**
   * The scenery currently being rendered — `useSceneSceneryStore`'s
   * `renderScenery` (S1), which the Phase K crossfade mutates track by track
   * rather than replacing in one jump. Drives the colour pipeline (S5) and
   * tick rate (S6).
   */
  scenery: SceneryDefinition;
}

/**
 * The actual `<Canvas>`, split into its own module so `next/dynamic` has a
 * single file to code-split — `three` and `@react-three/fiber` must never
 * enter a visitor's first-load bundle, exactly as `hero-core-scene.tsx`
 * already does for the Game Mode core. Section-scene groups mount here as
 * siblings of `SceneEnvironment`, all inside this one persistent canvas.
 */
export function SceneCanvas({
  active,
  reducedMotion,
  budget,
  tone,
  background,
  particlesEnabled,
  cameraScrollEnabled,
  signatureEnabled,
  driftersEnabled,
  scenery,
}: SceneCanvasProps) {
  // A no-op for `atelier` (`timescale: 1.0`) — the seam S6 exists for once a
  // later scenery sets a different rate.
  useEffect(() => {
    setSceneTimescale(scenery.timescale);
  }, [scenery.timescale]);

  // Lifted here, not inside each section-scene, so every section shares one
  // pointer listener instead of re-registering its own.
  const pointer = usePointer();

  // The drag's DOM half (D1). Registered on this side of the dynamic import so
  // the listeners live and die with the canvas, and only while something can
  // actually be grabbed — a touch device and reduced motion both opt out.
  const finePointer = useFinePointer();
  const grabEnabled = driftersEnabled && finePointer;
  // Every Projects variant but the corridor needs `scenePointer`, and none of
  // them is the drifters feature — blueprint's click-to-raise died with it.
  const pressVariant = scenery.projectsVariant !== "corridor";
  usePointerPress((grabEnabled || (pressVariant && finePointer)) && !reducedMotion);

  // The set piece plays on the lead project's panel. Subscribed, not polled:
  // this changes once, when the section's bridge hands its data over.
  const hasProjects = useSceneContentStore((state) => state.projects.length > 0);

  // Inspect mode (§6.3): rare enough that a React re-render on enter/exit is
  // free. `CameraRig` cedes the camera on the same flag `<InspectControls>`
  // mounts on.
  const inspectActive = useSceneInspectStore((state) => state.active);

  // Derived here rather than in `scene-root.tsx` so the colour maths stays on
  // the code-split side of the dynamic import, and memoised so a tone change
  // hands the section scenes the same object rather than a fresh one. The
  // skin (Phase G) overrides the line colour for scenery like blueprint that
  // draws its own accent regardless of the section's `--tone`.
  const palette = useMemo(
    () => applyScenerySkin(buildScenePalette(tone, background), scenery.skin),
    [tone, background, scenery.skin],
  );

  // `classify()` (device-tier.ts) only sees hardware signals before a single
  // frame has drawn, and can be wrong. `FpsMonitor` corrects that at runtime:
  // once it fires, every consumer below reads this stepped-down budget
  // instead of the server/hardware-guessed one, permanently for the session.
  const [runtimeTier, setRuntimeTier] = useState<typeof budget.tier | null>(null);
  const effectiveBudget = runtimeTier ? budgetFor(runtimeTier) : budget;

  const handleSustainedDrop = useCallback(() => {
    setRuntimeTier((prev) => stepDownTier(prev ?? budget.tier));
  }, [budget.tier]);

  // "three-particles" off zeroes just the environment's dust-field budget,
  // leaving geometry detail, DPR and every other section's budget untouched.
  const environmentBudget = particlesEnabled ? effectiveBudget : { ...effectiveBudget, particles: 0 };

  return (
    <Canvas
      dpr={[1, effectiveBudget.maxDpr]}
      // The rig's own waypoints carry the real focal length from the first
      // frame on; this is only the value before `CameraRig` has ticked once.
      camera={{ position: [0, 0, 6], fov: 46 }}
      // Explicit rather than left to R3F's defaults (S5): the values below
      // are what R3F already used for `atelier`, so this is a no-op switch
      // from implicit to explicit, not a visual change.
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: resolveToneMapping(scenery.toneMapping),
        toneMappingExposure: scenery.exposure,
        outputColorSpace: SRGBColorSpace,
      }}
      shadows={effectiveBudget.shadows}
      // Off-screen or backgrounded: stop the loop entirely rather than unmount
      // (a page-level canvas is expensive to rebuild). Reduced motion: render
      // once ("demand") instead of looping — still, not slow.
      frameloop={!active ? "never" : reducedMotion ? "demand" : "always"}
    >
      {/* First child on purpose: R3F ticks subscribers in mount order at equal
          priority, so the spring publishes this frame's `sceneScroll.progress`
          before anything below reads it. Priority stays 0 — a positive one
          would switch off automatic rendering. */}
      <ScrollPhysics reducedMotion={reducedMotion} active={active} />
      {/* Second, for the same reason: it derives this frame's beats from the
          spring's freshly published scroll, and the rig and the corridor below
          both read those beats in their own `useFrame`. */}
      <SignatureMoment
        enabled={signatureEnabled && hasProjects}
        reducedMotion={reducedMotion}
        budget={effectiveBudget}
      />
      {/* Reduced motion already renders "demand" (sparse, near-meaningless
          per-frame deltas), and an inactive/backgrounded canvas isn't ticking
          at all — the monitor only has something real to sample when neither
          holds. */}
      <FpsMonitor enabled={active && !reducedMotion} onSustainedDrop={handleSustainedDrop} />
      <CameraRig
        scrollEnabled={cameraScrollEnabled}
        reducedMotion={reducedMotion}
        pointer={pointer}
        inspectActive={inspectActive}
      />
      {inspectActive ? <InspectControls /> : null}
      <SceneLighting palette={palette} budget={effectiveBudget} scenery={scenery} reducedMotion={reducedMotion} />
      <SceneEnvironment budget={environmentBudget} palette={palette} reducedMotion={reducedMotion} />
      <HeroScene
        tone={palette.accent}
        toneSoft={palette.wash}
        reducedMotion={reducedMotion}
        budget={effectiveBudget}
        pointer={pointer}
        scenery={scenery}
      />
      <AboutScene
        tone={palette.accent}
        toneSoft={palette.wash}
        reducedMotion={reducedMotion}
        budget={effectiveBudget}
        scenery={scenery}
      />
      {/* No `pointer`: the skill graph reacts to the DOM pill the reader is
          actually on (`scene-interaction-store`), not to where the cursor
          happens to be over a canvas it cannot raycast. */}
      <SkillsScene
        tone={palette.accent}
        toneSoft={palette.wash}
        reducedMotion={reducedMotion}
        budget={effectiveBudget}
        scenery={scenery}
      />
      <ExperienceScene palette={palette} budget={effectiveBudget} reducedMotion={reducedMotion} scenery={scenery} />
      <ProjectsScene
        palette={palette}
        budget={effectiveBudget}
        reducedMotion={reducedMotion}
        pointer={pointer}
        scenery={scenery}
      />
      <ContactScene tone={palette.accent} toneSoft={palette.wash} reducedMotion={reducedMotion} />
      {/* Last, and after `CameraRig`: it copies the camera transform this frame
          rather than last frame's, which is what keeps a drag under the cursor. */}
      {driftersEnabled ? (
        <Drifters
          palette={palette}
          budget={effectiveBudget}
          reducedMotion={reducedMotion}
          pointer={pointer}
          materials={scenery.materials}
          grabEnabled={grabEnabled}
        />
      ) : null}
    </Canvas>
  );
}
