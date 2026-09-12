"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";

import { useCssColors } from "@/lib/experience/use-css-colors";
import { useSceneActive } from "@/lib/experience/use-scene-active";
import { useSceneBudget } from "@/lib/experience/use-scene-budget";
import { useSceneProgress } from "@/lib/experience/use-scene-progress";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

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
 * content. Scroll position (`useSceneProgress`) is the only story parameter
 * it reads — individual section identities are layered in on top of this
 * foundation by Phases 2–7, all inside the same canvas, never a second one.
 */
export function SceneRoot({ enabledAnimations }: SceneRootProps) {
  const [ref, active] = useSceneActive<HTMLDivElement>();
  const budget = useSceneBudget();
  const reducedMotion = useMotionPreference();
  const { tone, progress } = useSceneProgress();
  // Scoped to whichever section is currently under the eyeline, not always
  // "hero" — the persistent scene must track every tone, not just the first.
  const colors = useCssColors(["--tone", "--tone-soft"], `[data-tone="${tone}"]`);

  // "three-scene" off removes the whole layer, same as before Phase 9 wired
  // this up to Firestore — only the source of the flag changed.
  if (!enabledAnimations.includes("three-scene")) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0"
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
          progress={progress}
          tone={colors["--tone"] ?? "#f97316"}
          toneSoft={colors["--tone-soft"] ?? "#fdba74"}
          particlesEnabled={enabledAnimations.includes("three-particles")}
          cameraScrollEnabled={enabledAnimations.includes("three-camera-scroll")}
        />
      </SceneErrorBoundary>
    </div>
  );
}
