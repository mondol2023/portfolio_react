"use client";

import { useEffect, useMemo } from "react";

import { AmbientField } from "../entities/ambient-field";
import { FragmentField } from "../entities/fragment-field";
import { ImpactField } from "../entities/impact-field";
import { ParticleField } from "../entities/particle-field";
import { ShapeField } from "../entities/shape-field";
import { useGameSettings } from "../components/game-provider";
import { BUDGET_PRESETS } from "../config/game-config";
import { createParticleSimulation } from "../particles/simulation";
import { clearBodies } from "../physics/body-registry";
import { clearRenderRegistry } from "../render/render-registry";
import { createWorldSystems } from "../systems";
import { SystemRunner } from "../systems/system-runner";
import { emitGame } from "../events/game-bus";
import { useInteractionStore } from "../stores/interaction-store";
import { useShapeStore } from "../stores/shape-store";
import { useWorldStore } from "../stores/world-store";
import { refreshMaterials } from "../materials/material-registry";
import { useTonePalette } from "../config/palette";
import { primeAudio } from "../audio/audio-controller";

/**
 * Everything that exists *inside* the physics world: the ambient backdrop,
 * the interactive shape field, split debris, the particle field, and the
 * single system runner ticking all world logic.
 *
 * Owns the world's lifecycle: arming interaction (window listeners only act
 * while armed), announcing readiness, refreshing shared materials when the
 * host's theme or section tone changes, and clearing the registries on the
 * way out so a remount (or StrictMode double-mount) starts fresh.
 */
export function WorldComposition() {
  const { budget } = useGameSettings();
  const palette = useTonePalette();

  const particleSimulation = useMemo(
    () => createParticleSimulation(budget.particleBudget * 2),
    [budget.particleBudget],
  );
  const systems = useMemo(
    () => createWorldSystems(budget, particleSimulation),
    [budget, particleSimulation],
  );

  useEffect(() => {
    // Palette changes are theme or section-tone switches; shared materials
    // re-tint in place so no entity re-renders.
    refreshMaterials();
  }, [palette]);

  useEffect(() => {
    primeAudio();
    useWorldStore.getState().setStatus("ready");
    // Publish the population baseline immediately — the spawn system keeps
    // the interactive count fresh from its first frame, but the ambient
    // budget is known right here.
    useWorldStore
      .getState()
      .setCounts(useShapeStore.getState().entities.size, budget.ambientCount);
    useInteractionStore.getState().setArmed(true);
    emitGame({ type: "world", phase: "ready" });

    return () => {
      useInteractionStore.getState().reset();
      useWorldStore.getState().setStatus("idle");
      clearBodies();
      clearRenderRegistry();
      particleSimulation.reset();
      emitGame({ type: "world", phase: "paused" });
    };
  }, [particleSimulation, budget.ambientCount]);

  return (
    <>
      {/* The only lights in the world — two, so lit species stay cheap. */}
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 6, 3]} intensity={1.1} />

      <AmbientField total={budget.ambientCount} />
      <ShapeField />
      <FragmentField />
      {/* Mid/high tier only — `low` relies on the particle burst alone, and
          `ImpactSystem` mirrors this same gate for the logic side. */}
      {budget.particleBudget > BUDGET_PRESETS.low.particleBudget && <ImpactField />}
      <ParticleField simulation={particleSimulation} />

      <SystemRunner systems={systems} />
    </>
  );
}
