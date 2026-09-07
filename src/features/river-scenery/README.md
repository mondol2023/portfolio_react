# River scenery

Everything for the "Bangladeshi river day-cycle" background feature lives in this
one folder, so debugging it never means hunting across `components/layout`,
`components/motion`, and `lib/hooks` at once.

## What's here

- **`river-path/`** — the scroll-driven scene engine (moved from
  `components/surprise/effects/river-path/`, unchanged otherwise): sky/water
  gradient, skyline, paddy field, drifting boats, and night accents, all
  interpolating through a dawn → day → dusk → night palette
  (`river-path/palette.ts`) as `--t` tracks page scroll progress
  (`river-path/scroll-progress.ts`).

  It is consumed two ways:
  1. as the opt-in "surprise" easter egg, via
     `@/components/surprise/effects/index.ts` (`riverPath`);
  2. as the site's persistent backdrop, via `river-scenery-backdrop.tsx` below.

- **`river-scenery-backdrop.tsx`** — runs `river-path` unconditionally for the
  life of the public shell, mounted once in `app/(site)/layout.tsx` alongside
  `<AmbientBackground />` (not replacing it: `river-path` composites at
  `LAYER.backdrop` (-8), above `.ambient`'s -10, so the section-tone colour
  and light/dark rays-or-stars toggle keep working underneath the scene).
  Reduced motion drops it outright, via `useMotionPreference()`, the same rule
  `SiteAnimations` applies to every `animated` effect.

- **`hero-photo.tsx`** — the Hero's photographic element (the non-CSS scene,
  per the hybrid approach): one or more `next/image fill` layers reading
  `settings.heroImageUrls`, each gated through `isAllowedImageSrc` so it can
  only ever render a URL on an already-approved host. One photo renders
  statically; two or more are all mounted at once and cross-fade every 9s on a
  `setInterval` timer (simpler than swapping `src` and re-fetching on every
  switch). Renders nothing when the list is empty, which is the entire
  fallback — `Hero` then shows its original grid + glow. Each photo's slow
  Ken-Burns drift is a plain CSS animation (`hero-photo-drift` in
  `globals.css`), stopped outright under `prefers-reduced-motion` there; the
  crossfade transition itself is `motion-safe:` only, so reduced motion gets
  an instant cut instead of a fade. A client component — the rotation needs a
  timer — unlike the rest of `Hero`.

## Planned additions (see the conversation this folder was created from)

- `use-section-dominance.ts` — picks whichever section occupies the largest
  share of the viewport (with hysteresis, so fast scrolling doesn't strobe)
  and re-seeds each layer's randomized placements (`boats.ts`, `paddy-field.ts`,
  `night-accents.ts`) when it changes — the "feels different each scroll"
  half of the brief; the day-cycle itself already runs continuously off page
  scroll progress.
- An admin on/off toggle for the whole backdrop (Phase 4), reusing the same
  plumbing `animation-toggles.tsx` uses for the surprise-effect pins.

## Why it moved

`river-path` used to be a private asset of the surprise-effect kit
(`components/surprise/effects/`). It's being promoted to power the site's
always-on backdrop, so it needed a home that isn't nested inside a system it
no longer only belongs to. `components/surprise/effect.ts`'s shared DOM
helpers (`mountLayer`, `injectStyle`, `fadeIn`, `randomOf`, `between`, the
`LAYER` z-index table) stay where they are — they're generic, and both the
surprise kit and this feature import them via the `@/components/surprise/effect`
alias rather than a relative path.
