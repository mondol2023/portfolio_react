"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode, useEffect } from "react";

import { registerVeilTarget } from "@/lib/experience/scenery-transition";
import { useCssColors } from "@/lib/experience/use-css-colors";
import { useSceneActive } from "@/lib/experience/use-scene-active";
import { useSceneBudget } from "@/lib/experience/use-scene-budget";
import { useSceneTone } from "@/lib/experience/use-scene-progress";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { useSceneInspectStore } from "@/lib/store/scene-inspect-store";
import { useSceneSceneryStore } from "@/lib/store/scene-scenery-store";
import { cn } from "@/lib/utils/cn";

const SceneCanvas = dynamic(() => import("./scene-canvas").then((mod) => mod.SceneCanvas), {
  ssr: false,
  loading: () => null,
});

/**
 * A WebGL context can fail to initialise for reasons no budget check can see
 * in advance (a blocked driver, a context limit already hit elsewhere on the
 * page). This is the persistent, site-wide canvas, so a failure here must
 * fall back to nothing rather than take the whole public shell down with it
 * — the same contract `hero-core.tsx`'s boundary already keeps for the Game
 * Mode core.
 */
class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface SceneRootProps {
  /**
   * Ids currently switched on at `/admin/settings`, resolved server-side in
   * `(site)/layout.tsx` via `getAnimationSettings()` and passed down as a
   * plain prop — the same `content` document the admin form writes to.
   */
  enabledAnimations: readonly string[];
}

/**
 * The persistent 3D layer for the whole public site: one `<Canvas>`, mounted
 * once here in `(site)/layout.tsx`, fixed behind every section's DOM
 * content. Scroll position (`use-scene-progress.ts`) is the only story
 * parameter it reads — but it reads it inside the frame loop, via
 * `<ScrollPhysics>`, not through React: only the section `tone` crosses this
 * boundary as a prop, because only it changes at a rate React should see.
 */
export function SceneRoot({ enabledAnimations }: SceneRootProps) {
  const [ref, active] = useSceneActive<HTMLDivElement>();
  const budget = useSceneBudget();
  const reducedMotion = useMotionPreference();
  const tone = useSceneTone();
  // Reads `renderScenery`, not `id` — the crossfade (Phase K) lags the
  // committed picker choice by up to 900ms; this is the id/definition WebGL
  // and `data-scenery` actually see.
  const scenery = useSceneSceneryStore((state) => state.renderScenery);

  // Registers this wrapper as one of the two things the crossfade dips (the
  // other is `<AmbientBackground>`, S13's "visible half") — an imperative
  // ref registration, not a store subscription, so mounting here never
  // re-renders on a switch.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return registerVeilTarget(el);
  }, [ref]);
  // Inspect mode (§6.3): the canvas is `pointer-events-none` everywhere else
  // in the site (it sits behind opaque content), but Inspect needs the free
  // orbit to actually receive the drag it started from.
  const inspectActive = useSceneInspectStore((state) => state.active);
  // Scoped to whichever section is currently under the eyeline, not always
  // "hero" — the persistent scene must track every tone, not just the first.
  // `--bg` is a document-level token but inherits down to the same element,
  // so one read covers both the section accent and the page it sits on;
  // `--tone-soft` is deliberately not read here, since `useCssColors` cannot
  // carry its alpha (see `scene-palette.ts`).
  const colors = useCssColors(["--tone", "--bg"], `[data-tone="${tone}"]`);

  // "three-scene" off removes the whole layer, same as before Phase 9 wired
  // this up to Firestore — only the source of the flag changed.
  if (!enabledAnimations.includes("three-scene")) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn("fixed inset-0", inspectActive ? "pointer-events-auto" : "pointer-events-none")}
      // Behind the ambient CSS background's blobs/stars (-10) is too far back
      // to read at all; behind every section's DOM content (which stacks at
      // the default 0) is the actual requirement. Sitting between the two
      // keeps the plan's stated mount order (`AmbientBackground` → this
      // layer → content) true in the paint order as well.
      style={{ zIndex: -8 }}
    >
      <SceneErrorBoundary>
        <SceneCanvas
          active={active}
          reducedMotion={reducedMotion}
          budget={budget}
          tone={colors["--tone"] ?? "#c2410c"}
          background={colors["--bg"] ?? "#fbfaf9"}
          particlesEnabled={enabledAnimations.includes("three-particles")}
          cameraScrollEnabled={enabledAnimations.includes("three-camera-scroll")}
          signatureEnabled={enabledAnimations.includes("three-signature")}
          driftersEnabled={enabledAnimations.includes("three-drifters")}
          scenery={scenery}
        />
      </SceneErrorBoundary>
    </div>
  );
}
