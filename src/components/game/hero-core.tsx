"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";

import { useCssColors } from "@/lib/experience/use-css-colors";
import { usePointer } from "@/lib/experience/use-pointer";
import { useSceneActive } from "@/lib/experience/use-scene-active";
import { useSceneBudget } from "@/lib/experience/use-scene-budget";
import { useGameProgress } from "@/lib/hooks/use-game-progress";

/**
 * The Hero's Game Mode backdrop — a wireframe "core" scene built with
 * react-three-fiber, using the budget/pointer/visibility layer that already
 * existed unwired in `lib/experience/`.
 *
 * Gated on `mode === "game"` before anything else runs: the `dynamic()` import
 * below is only requested once this component actually renders, so a Normal
 * Mode visitor's bundle never contains `three` or `@react-three/fiber` — the
 * same non-negotiable the toggle and HUD already follow.
 */

const HeroCoreScene = dynamic(() => import("./hero-core-scene").then((mod) => mod.HeroCoreScene), {
  ssr: false,
  loading: () => null,
});

/**
 * The core is decoration, not content — Game Mode's toggle and HUD keep
 * working with or without it. A WebGL context can fail to initialise for
 * reasons no budget check can see in advance (a blocked driver, a context
 * limit already hit elsewhere on the page), so a failure here renders nothing
 * rather than taking the Hero down with it.
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

export function HeroCore() {
  const { mode } = useGameProgress();
  const [ref, active] = useSceneActive<HTMLDivElement>();
  const budget = useSceneBudget();
  const pointer = usePointer();
  const colors = useCssColors(["--tone", "--tone-soft"], '[data-tone="hero"]');

  if (mode !== "game") return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 right-[-6rem] hidden size-[34rem] -translate-y-1/2 opacity-80 lg:block"
    >
      <SceneErrorBoundary>
        <HeroCoreScene
          active={active}
          budget={budget}
          pointer={pointer}
          tone={colors["--tone"] ?? "#f97316"}
          toneSoft={colors["--tone-soft"] ?? "#fdba74"}
        />
      </SceneErrorBoundary>
    </div>
  );
}
