"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";

import { useGameActive } from "./game-provider";

/**
 * The canvas host.
 *
 * Renders a fixed, full-viewport, `pointer-events: none` layer at z-index -5 —
 * above the host's ambient background (-10), below every piece of content.
 * Sections in the host create their own stacking contexts, so nothing inside
 * them can ever paint below this layer, and no pointer event ever reaches the
 * canvas: all interaction is handled by window-level listeners with explicit
 * target filtering (see `interactions/`, Phase 6), which is what guarantees
 * buttons, links and forms stay fully clickable.
 *
 * The heavy scene is a `next/dynamic` import with `ssr: false`, so `three` and
 * friends never enter a bundle until the world actually activates — the same
 * non-negotiable the host's `HeroCore` follows.
 */
const GameRoot = dynamic(() => import("../world/game-root").then((mod) => mod.GameRoot), {
  ssr: false,
  loading: () => null,
});

/**
 * The world is decoration, not content — the host's UI keeps working with or
 * without it. A WebGL context can fail for reasons no capability check can
 * predict (blocked driver, exhausted context limit), so a failure here renders
 * nothing rather than taking the page down with it.
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

export function GameScene() {
  const active = useGameActive();

  if (!active) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-[5]">
      <SceneErrorBoundary>
        <GameRoot />
      </SceneErrorBoundary>
    </div>
  );
}
