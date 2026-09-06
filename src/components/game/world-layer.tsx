"use client";

import dynamic from "next/dynamic";

import { useGameProgress } from "@/lib/hooks/use-game-progress";

/**
 * The bridge between the portfolio and the portable world layer in `src/game`.
 *
 * This file — and the one-line mount in `(site)/layout.tsx` — is the *entire*
 * integration surface. Deleting `src/game`, this file pair, and that line
 * removes the world from the portfolio completely.
 *
 * Bundle discipline: the host-visible component here imports nothing from
 * `@/game` — only the existing exploration store. The world (and its
 * `three`/Rapier dependency tree) loads exclusively through the dynamic
 * import below, so a Normal Mode visitor downloads zero world bytes, exactly
 * like the host's own `HeroCore`.
 */
const WorldLayerClient = dynamic(() => import("./world-layer-client"), {
  ssr: false,
  loading: () => null,
});

export function WorldLayer() {
  const { mode } = useGameProgress();
  const active = mode === "game";

  if (!active) return null;

  return <WorldLayerClient />;
}
