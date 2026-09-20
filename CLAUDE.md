# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md



## Commands

```bash
npm run dev         # dev server at http://localhost:3000
npm run build        # production build
npm start             # serve the production build
npm run lint          # eslint . — Next.js 16 removed `next lint`; this is the only linter
npm run typecheck     # next typegen && tsc --noEmit — regenerates .next/types before checking
```

There is no test suite/runner configured in this repo (no `test` script, no Vitest/Jest).

Content and admin-account scripts (require `.env.local`, see below):

```bash
npm run set-admin -- you@example.com [--revoke]   # grant/revoke the admin custom claim + admins/{uid} doc
npm run seed [-- --force]                          # write starter Firestore content
npm run test-firebase                              # verify Admin SDK credentials connect
npm run deploy-rules                                # deploy firestore.rules / firestore.indexes.json
```

To run a single check, scope the tool directly, e.g. `npx eslint src/three/scene/scene-canvas.tsx` or `npx tsc --noEmit -p tsconfig.json` after `next typegen`.

## Architecture

This is a Next.js 16 App Router portfolio with a Firebase-backed admin CMS — **no separate backend service**; every read, write and authorization check happens in Server Components and Server Actions. Read `src/../README.md` for the full setup, environment variables, data model and deployment story; it is authoritative and not duplicated here.

### Layers, from the ground up

- **`src/lib/firebase/`** — the only code that talks to Firestore. `admin.ts` (server-only Admin SDK bootstrap), `client.ts` (browser SDK, used solely on `/admin/login`), `session.ts` (httpOnly session cookies + `requireAdmin()`), `repositories/` (one module per collection). Reads never throw (missing config degrades to empty lists so pages render their empty state); writes always throw. Reads are wrapped in React `cache()`.
- **`src/lib/actions/`** — Server Actions, each wrapped in `withAdmin()` which re-runs `requireAdmin()` server-side regardless of which layout rendered the form. Authorization is enforced independently at three layers: the admin layout redirect, every mutating action, and Firestore security rules (`firestore.rules`) — removing any one still leaves the others standing.
- **`src/lib/validation/`** — Zod schemas, independent of any UI, shared by forms and actions.
- **`src/components/`** — `sections/` (one public homepage section per file), `admin/` (CMS forms/tables), `motion/` (reusable animation primitives), `ui/` (buttons, fields, dialogs, toasts), `theme/`.
- **`src/app/(site)/`** vs **`src/app/admin/(dashboard)/`** — separate route trees that share no layout; the admin tree is invisible to public visitors (absent from nav, `sitemap.xml`, and allowed by `robots.txt` to be disallowed).

### Two independent 3D systems — do not conflate them

- **`src/three/`** — the *persistent site-wide scene*. One `<Canvas>` (`src/three/scene/scene-root.tsx` → dynamically-imported `scene-canvas.tsx`), mounted once in `(site)/layout.tsx`, fixed behind every section's DOM content (`z-index: -8`). `src/three/sections/*-scene.tsx` are per-homepage-section scene groups that mount as siblings inside the one canvas; `src/three/objects/` holds the meshes/effects each section scene composes. Scroll position and section "tone" are the only state that crosses the React boundary — everything else is read inside the frame loop (`ScrollPhysics`, `scene-timer`, `use-css-colors`) to keep motion render-free. Device-tier budgeting (`src/lib/experience/device-tier.ts`) and a runtime `FpsMonitor` step down quality live. Individual layers (particles, camera scroll, the signature Projects→Experience set piece, drifters) are toggled per-flag from `/admin/settings` via `enabledAnimations`. Comments in this tree run long (multi-line "why" blocks) by established convention — match that style only when editing existing files here; keep new comments terse elsewhere.
- **`src/game/`** — a portable, fully-removable interactive world (React Three Fiber + Rapier physics + Zustand), active only in "Game Mode" and layered separately behind the site (`src/components/game/world-layer.tsx` bridges it in). Its own README (`src/game/README.md`) is authoritative: **no imports from `@/lib` or `@/components`** (theme coupling is CSS custom properties only, via `config/palette.ts`), gameplay logic lives in `systems/` behind a `GameSystem` interface ticked by `SystemRunner`, one focused Zustand store per concern (no god store), physics transforms never enter React state (meshes read Rapier bodies directly), and systems communicate only through `events/game-bus.ts`, never by importing each other. `src/game/index.ts` is the sole public export surface (`GameProvider`, `GameScene`, `GameOverlay`, `GameHUD`, `CameraController`, `GameEffects`). Both `three` and Rapier load only via `next/dynamic` after activation — zero world bytes ship in Normal Mode.

### Data model

Firestore collections: `projects/{id}`, `experience/{id}`, `skills/{id}`, `content/about`, `content/siteSettings`, `messages/{id}`, `admins/{uid}`. Dates are ISO strings (`YYYY-MM-DD`) everywhere above the repository layer; `Timestamp` conversion is confined to `src/lib/firebase/converters.ts`. Skills use qualitative proficiency levels, not percentages.

Before Firebase is configured (and until content exists), the public site falls back to demo content from `src/lib/constants/demo-content.ts`, each section independently, each carrying a visible "Sample data" badge. Set `PORTFOLIO_DEMO_CONTENT=off` to see real empty states instead.

### Conventions

- Path alias `@/*` → `./src/*` (see `tsconfig.json`).
- TypeScript `strict` + `noUncheckedIndexedAccess`; Tailwind CSS v4 is CSS-first (no `tailwind.config.ts`).
- Motion (`motion/react`) is gated on `prefers-reduced-motion` via `useMotionPreference()` throughout — check it before adding new animated components.
- `seed.js` is a CommonJS script run outside the bundler (see the eslint override for it) — don't "fix" its `require()` calls.
