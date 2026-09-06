# Game Layer — Interactive World Module

A portable, fully-removable interactive 3D world (React Three Fiber + Rapier
physics + Zustand) that floats **behind** the portfolio when the visitor is in
Game Mode. Drag shapes around, poke them until they split, overlap two of them
so they fuse into a bigger composite shape, hold to collect them for points.

## Public API

`src/game/index.ts` is the **only** import surface:

| Export | Role |
| --- | --- |
| `GameProvider` | Activation gate, settings, and the `onEvent` bridge |
| `GameScene` | The canvas layer (fixed, `z-index: -5`, pointer-events none) |
| `GameOverlay` | HTML overlay root (score popups, HUD chip) |
| `GameHUD` | Score chip + mute toggle + gesture hint |
| `CameraController` | Public camera slot — rig logic lives in `systems/camera-system.ts` (GSAP intro dolly + scroll drift) |
| `GameEffects` | Reserved post-processing slot |

## Architecture rules

- **No host imports.** Nothing in `src/game` imports from `@/lib` or
  `@/components`. Theme coupling is CSS custom properties only
  (`config/palette.ts`). The module can be copied into any project.
- **Systems, not god components.** All gameplay decisions live in
  `systems/` behind the `GameSystem` interface and are ticked once per frame
  by `SystemRunner` in a fixed order (see `systems/index.ts`). Components are
  declarators; hooks/factories hold logic; JSX never decides.
- **One focused store per concern** (`stores/`) — shape, fragment, score,
  interaction, particle, audio, camera, world. No god store. Physics
  transforms never enter React state: meshes read Rapier bodies directly, so
  motion is render-free.
- **Events over imports** (`events/game-bus.ts`): systems emit; score/audio/
  particles subscribe; the host may listen via `onEvent`. Systems stay
  strangers to each other.
- **Content always wins.** The canvas takes no pointer events. Interaction is
  window-level raycasting filtered through `interactions/event-filter.ts` —
  presses on links, buttons, form fields, prose, and `[data-game-ignore]`
  targets are ignored entirely.
- **Library split:** R3F/Rapier own the world · GSAP owns camera timelines ·
  Motion owns the HTML overlay · Zustand owns cross-cutting state.
- **Accessibility:** reduced motion freezes ambient drift, hover pulses and
  the camera sway; the loop stops on hidden tabs; HUD controls are real
  buttons with visible focus.

## Integration (what to add to a host)

1. `src/components/game/world-layer.tsx` + `world-layer-client.tsx` — the
   bridge (reads the host's Game Mode flag, dynamically imports the world).
2. One line in the public shell: `<WorldLayer />` in
   `src/app/(site)/layout.tsx`.

No other host file is touched. Normal Mode downloads **zero** world bytes
(`three`/Rapier load only via `next/dynamic` after activation).

## Removal

1. `git rm -r src/game`
2. `git rm src/components/game/world-layer.tsx src/components/game/world-layer-client.tsx`
3. Remove the `<WorldLayer />` render and its import from
   `src/app/(site)/layout.tsx`.

That is the complete surface — grep for `@/game` or `src/game` to confirm
nothing else references the module.

## Tuning

Every number lives in `config/game-config.ts` (bounds, forces, cooldowns,
combo rules, fusion knobs, budget presets) and `config/shape-registry.ts`
(the authored species table). Adding a species is a registry row, never a
system change.

Composite species are not authored at all. Two overlapping shapes fuse into a
kind that names its own recipe — `fused:crystal+cube` — and
`config/fusion.ts` + `definitionFor` derive its size, physics, geometry and
material from the rows of its ingredients. Volumes add (`r = ∛(Σ rᵢ³)`), so a
fusion is genuinely bigger than either part, and its mesh is the parts welded
into one buffer.
