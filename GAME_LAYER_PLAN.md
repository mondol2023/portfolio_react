# Isolated Game Layer — Delivery Plan

## Scope and safety boundary

- Target: `my-portfolio` only.
- Preserve all existing portfolio, admin, API, data, authentication, and CMS behavior.
- Keep the game implementation portable under `src/game`.
- Integrate only with the public route-group layout, never the root or admin layout.
- Keep the canvas behind document content and non-intercepting by default.

## Phase 1 — Audit

- [x] Identify the public-shell integration point and existing visual/animation infrastructure.
- [x] Confirm that the target uses React Three Fiber, Drei, Three.js, GSAP, and Motion already.
- [x] Identify Zustand as the one required dependency that is not present.

## Phase 2 — Plugin foundation

- [ ] Add `src/game` with public entry points, strict types, configuration, and focused Zustand stores.
- [ ] Define systems for spawning, animation, interactions, merge/split, particles, audio hooks, and scoring.
- [ ] Add reusable entity factories without coupling them to portfolio data or routes.

## Phase 3 — World and entities

- [ ] Build the lazy-loaded R3F background world with shared geometry/materials and an instanced object field.
- [ ] Add interactive shapes, fragments, particle feedback, and a decorative low-poly environment.
- [ ] Respect reduced motion, device capability, visibility, and WebGL-failure fallbacks.

## Phase 4 — Controls and overlay

- [ ] Add a small, keyboard-accessible HUD and an explicit interaction toggle.
- [ ] Ensure the canvas never captures events over portfolio links, buttons, inputs, or dialogs.
- [ ] Use Motion for HTML overlay transitions and GSAP only for scene/camera timelines where needed.

## Phase 5 — Minimal integration and verification

- [ ] Add Zustand to the target dependencies.
- [ ] Mount the game layer in `src/app/(site)/layout.tsx` only, leaving `/admin` untouched.
- [ ] Run typecheck, lint, production build, and visual checks at desktop and mobile widths.
- [ ] Verify removal requires deleting `src/game` plus the few public-shell imports.
