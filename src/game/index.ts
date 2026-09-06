/**
 * Public API of the interactive world layer.
 *
 * This barrel is the *only* module the host portfolio should import —
 * everything else in `src/game` is an implementation detail. Removing the
 * game layer from the portfolio means deleting this folder and the handful
 * of imports that point here; nothing else owns a reference.
 *
 * Split of responsibilities across libraries:
 * - **React Three Fiber + Rapier** own the world: objects, physics, collisions.
 * - **GSAP** owns cinematic camera timelines (Phase 5).
 * - **Motion** owns the HTML overlay (score chip, hints, notices).
 * - **Zustand** owns cross-cutting state (one focused store per concern).
 */
export { GameProvider, useGameActive, useGameSettings } from "./components/game-provider";
export type { GameProviderProps } from "./components/game-provider";
export { GameScene } from "./components/game-scene";
export { GameOverlay } from "./components/game-overlay";
export { GameHUD } from "./components/game-hud";
export { CameraController } from "./components/camera-controller";
export { GameEffects } from "./components/game-effects";

/** Types the host needs to type its bridge without reaching into internals. */
export type { GameEvent, GameSettings, GameBudget } from "./types/game";
