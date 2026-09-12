"use client";

import { Canvas } from "@react-three/fiber";
import { useCallback, useMemo, useState } from "react";

import { budgetFor, stepDownTier, type SceneBudget } from "@/lib/experience/device-tier";
import { buildScenePalette } from "@/lib/experience/scene-palette";
import { usePointer } from "@/lib/experience/use-pointer";
import { AboutScene } from "@/three/sections/about-scene";
import { ContactScene } from "@/three/sections/contact-scene";
import { ExperienceScene } from "@/three/sections/experience-scene";
import { HeroScene } from "@/three/sections/hero-scene";
import { ProjectsScene } from "@/three/sections/projects-scene";
import { SkillsScene } from "@/three/sections/skills-scene";

import { CameraRig } from "./camera-rig";
import { SceneEnvironment } from "./environment";
import { FpsMonitor } from "./fps-monitor";
import { SceneLighting } from "./lighting";

interface SceneCanvasProps {
  active: boolean;
  reducedMotion: boolean;
  budget: SceneBudget;
  progress: number;
  /** The current section's resolved `--tone`. */
  tone: string;
  /** The theme's resolved `--bg` — what the scene's atmosphere and depth fade toward. */
  background: string;
  /** The "three-particles" switch — gates `SceneEnvironment`'s dust field only. */
  particlesEnabled: boolean;
  /** The "three-camera-scroll" switch — gates `CameraRig`'s dolly only. */
  cameraScrollEnabled: boolean;
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
  progress,
  tone,
  background,
  particlesEnabled,
  cameraScrollEnabled,
}: SceneCanvasProps) {
  // Lifted here, not inside each section-scene, so every section shares one
  // pointer listener instead of re-registering its own.
  const pointer = usePointer();

  // Derived here rather than in `scene-root.tsx` so the colour maths stays on
  // the code-split side of the dynamic import, and memoised because the
  // section scenes take it as a prop and `progress` re-renders this component
  // on every scroll event.
  const palette = useMemo(() => buildScenePalette(tone, background), [tone, background]);

  // `classify()` (device-tier.ts) only sees hardware signals before a single
  // frame has drawn, and can be wrong. `FpsMonitor` corrects that at runtime:
  // once it fires, every consumer below reads this stepped-down budget
  // instead of the server/hardware-guessed one, permanently for the session.
  const [runtimeTier, setRuntimeTier] = useState<typeof budget.tier | null>(null);
  const effectiveBudget = runtimeTier ? budgetFor(runtimeTier) : budget;

  const handleSustainedDrop = useCallback(() => {
    setRuntimeTier((prev) => stepDownTier(prev ?? budget.tier));
  }, [budget.tier]);

  // "three-camera-scroll" off holds the dolly at its rest framing (the Hero
  // waypoint, `progress = 0`) rather than reacting to scroll. Every
  // section-scene below still reads the real `progress` for its own
  // entry/exit fade — only the camera's own travel freezes.
  const cameraProgress = cameraScrollEnabled ? progress : 0;

  // "three-particles" off zeroes just the environment's dust-field budget,
  // leaving geometry detail, DPR and every other section's budget untouched.
  const environmentBudget = particlesEnabled ? effectiveBudget : { ...effectiveBudget, particles: 0 };

  return (
    <Canvas
      dpr={[1, effectiveBudget.maxDpr]}
      // The rig's own waypoints carry the real focal length from the first
      // frame on; this is only the value before `CameraRig` has ticked once.
      camera={{ position: [0, 0, 6], fov: 46 }}
      gl={{ antialias: true, alpha: true }}
      shadows={effectiveBudget.shadows}
      // Off-screen or backgrounded: stop the loop entirely rather than unmount
      // (a page-level canvas is expensive to rebuild). Reduced motion: render
      // once ("demand") instead of looping — still, not slow.
      frameloop={!active ? "never" : reducedMotion ? "demand" : "always"}
    >
      {/* Reduced motion already renders "demand" (sparse, near-meaningless
          per-frame deltas), and an inactive/backgrounded canvas isn't ticking
          at all — the monitor only has something real to sample when neither
          holds. */}
      <FpsMonitor enabled={active && !reducedMotion} onSustainedDrop={handleSustainedDrop} />
      <CameraRig progress={cameraProgress} reducedMotion={reducedMotion} pointer={pointer} />
      <SceneLighting palette={palette} budget={effectiveBudget} />
      <SceneEnvironment budget={environmentBudget} palette={palette} reducedMotion={reducedMotion} />
      <HeroScene
        tone={palette.accent}
        toneSoft={palette.wash}
        reducedMotion={reducedMotion}
        progress={progress}
        budget={effectiveBudget}
        pointer={pointer}
      />
      <AboutScene
        tone={palette.accent}
        toneSoft={palette.wash}
        reducedMotion={reducedMotion}
        budget={effectiveBudget}
        progress={progress}
      />
      <SkillsScene
        tone={palette.accent}
        toneSoft={palette.wash}
        reducedMotion={reducedMotion}
        progress={progress}
        budget={effectiveBudget}
        pointer={pointer}
      />
      <ExperienceScene
        tone={palette.accent}
        toneSoft={palette.wash}
        reducedMotion={reducedMotion}
        progress={progress}
      />
      <ProjectsScene
        palette={palette}
        budget={effectiveBudget}
        reducedMotion={reducedMotion}
        progress={progress}
        pointer={pointer}
      />
      <ContactScene
        tone={palette.accent}
        toneSoft={palette.wash}
        reducedMotion={reducedMotion}
        progress={progress}
      />
    </Canvas>
  );
}
