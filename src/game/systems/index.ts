import { AudioSystem } from "./audio-system";
import { AnimationSystem } from "./animation-system";
import { CameraSystem } from "./camera-system";
import { ImpactSystem } from "./impact-system";
import { InteractionSystem } from "./interaction-system";
import { MergeSystem } from "./merge-system";
import { ParticleSystem } from "./particle-system";
import { PhysicsSystem } from "./physics-system";
import { ScoreSystem } from "./score-system";
import { SpawnSystem } from "./spawn-system";
import { SplitSystem } from "./split-system";

import type { GameBudget, GameSystem } from "./types";
import type { ParticleSimulation } from "../particles/simulation";

/**
 * Assembles the world's systems in their fixed tick order:
 *
 * 1. **spawn** — population top-ups first, so later systems see fresh shapes
 * 2. **interaction** — input applies before gameplay decisions
 * 3. **physics** — containment after gameplay forces
 * 4. **merge** — proximity scan over the settled bodies
 * 5. **split** — fragment integration
 * 6. **particles** — bursts queued by everything above
 * 7. **impact** — shockwave rings queued alongside those same bursts
 * 8. **score** — economy decay cadence
 * 9. **camera** — rig pose, reading the frame's final world state
 * 10. **animation** — visuals absolute last, so what renders is what decided
 * 11. **audio** — event-driven; rides the runner purely for lifecycle pairing
 *
 * Called from a component (`world/world-composition.tsx`) inside `useMemo`,
 * which is why the budget is an argument here rather than a hook read —
 * factories never call hooks.
 */
export function createWorldSystems(budget: GameBudget, particleSimulation: ParticleSimulation): GameSystem[] {
  return [
    new SpawnSystem(budget),
    new InteractionSystem(),
    new PhysicsSystem(),
    new MergeSystem(),
    new SplitSystem(),
    new ParticleSystem(particleSimulation),
    new ImpactSystem(budget),
    new ScoreSystem(),
    new CameraSystem(),
    new AnimationSystem(),
    new AudioSystem(),
  ];
}
