# Step 3 — Senior Implementation Strategy & Execution Plan

Grounded in Audit 1 ([docs/audit1.md](./audit1.md)) and Audit 2 ([docs/audit2.md](./audit2.md)), plus a targeted validation pass (not a re-audit) of `site-layers.ts`, `layout.tsx`, `section.tsx`, `repo-imagery/README.md`, `demo-content.ts`, `cover.ts`, `living-river/README.md`, `circuit-road.tsx`, and `site-layer-toggles.tsx`. No code was touched while writing this plan. Two validation findings materially changed the plan below — flagged inline as **[VALIDATED]**.

**[VALIDATED] BombIntro is currently dead code.** `src/components/sections/section.tsx` imports it (line 6) but never renders it — the JSX only wraps `children` in `ScrollVeil`. It is not gating any content on the live site today. This doesn't change the tonal verdict (still wrong for the site), but it changes the *risk profile* of removing it from "touch a content-critical animation gate" to "delete an unused import and an unused file." Phase 2 is now nearly zero-risk.

**[VALIDATED] repo-imagery's admin wiring is already done.** Its own README's "How it is wired" section confirms `project-form.tsx` already imports `RepoImageryPanel`. The remaining gap is narrower than Audit 2's framing: `DEMO_PROJECTS` in `demo-content.ts` has an explicit code comment stating the omission of `featuredImage`/`gallery` is *deliberate* ("avoids shipping stock photography… keeps the demo working offline"), not an oversight. Atlas/Beacon are fictional — they have no real GitHub repo for the harvest/Unsplash sources to find anything on. Only the **Generated Covers** source (`cover.ts`, needs nothing but title/language/topics) applies to them. Phase 1 is therefore "generate covers for the demo projects," not "wire a feature."

**[VALIDATED] circuit-road confirmed structurally isolated** ("mounted with one line and removed with one line… nothing else in the app knows it exists" — its own file header) and confirmed **not** in `conflicts` against `section-scenery` in `site-layers.ts`, matching Audit 2 exactly. Deletion is low-risk.

**[VALIDATED] living-river's conflict wiring is already correct** (`conflicts: ["section-scenery"]` is real, not aspirational) and `river-scenery/` is confirmed still on disk but unreferenced from `layout.tsx` — genuinely dead, not a live fallback.

---

## 1. Final Creative Direction

> **"The page is a place with weather in it."**

- **Visual personality:** quietly confident, warm, narrative. One tone system, one recurring glow-disc motif (sun↔moon), restraint over spectacle. Already true — protect it, don't touch it.
- **Motion personality:** everything reads as *weather*, not *effects* — gusts, parting stalks, rain leaning, fireflies rising, water that responds to the reader. Every new motion decision gets tested against this metaphor before it ships.
- **3D/depth personality:** restrained everywhere, one deliberate deep breath. Depth is mostly illusion (section-scenery's parallax/rails) by design — cheap, per-section, correct default. Real 3D (living-river's ray-marched water) exists in exactly one place and should feel like the page taking a breath, not a tech demo.
- **Signature experience:** living-river, promoted from hidden admin flag to the thing capable, attentive visitors actually encounter (see §2).
- **Supporting motion:** section-tone crossfade + scenery scene-switch (wayfinding), ScrollVeil rise/hold/fade, the work-scene's one-shot "arrival," hover-reveal on project cards, header hide-on-scroll + active-nav pill.
- **Mobile philosophy:** its own deliberately-designed experience, not "desktop minus effects." Motion reads *more* prominent per pixel on a phone, so mobile gets a slower, lower-density, ambient-only version of the same scenes — never a bare page, never the heavy layers.
- **Accessibility philosophy:** reduced-motion means *nothing renders*, not *renders slower*. Already the site's consistent policy (SectionScenery returns `null`, living-river "drops the scene outright") — preserve exactly, close the one known gap (circuit-road, moot once deleted).
- **Performance philosophy:** exactly one full-viewport decorative system at a time, ever (already architecturally enforced via the conflicts graph). Quality only ever falls, never climbs back mid-session. Heavy/optional systems are code-split so their JS cost tracks what's actually enabled, not what merely exists in the repo.

---

## 2. Major Architectural / Design Decisions

### 2.1 Project imagery
**Decision: generate covers for the demo/seed projects; the admin-panel wiring is already finished.**
Since Atlas/Beacon are fictional, the GitHub-harvest and Unsplash sources have nothing to find — only **Generated Covers** (needs nothing but title/description/language/topics, `cover.ts`) applies. Recommended mechanism: a small server-only helper computes each demo project's `featuredImage` as a signed `/api/repo-imagery/cover` URL at read time (via `projects-repository.ts`, reusing `encodeCoverParams` + the existing signing function), rather than hand-pasting a static signed string into `demo-content.ts` — a hand-pasted URL would 403 silently if `REPO_IMAGERY_SECRET` is ever set later (the README explicitly warns saved covers break when the secret changes). Computing it at read time sidesteps that entirely. This needs zero manual admin action and keeps the demo working offline, matching the original design intent in `demo-content.ts`'s own comment.
Gallery/hover-reveal (§1c of Audit 2) rides along for free once a second distinct image exists — give each demo project two covers (different `variant`) rather than the same one twice, so hover-reveal has something real to show.

### 2.2 BombIntro
**Decision: remove it completely.** Not demote to opt-in.
- It's tonally the wrong register for a "weather" site — a cel-shaded cartoon bomb next to a paddy field and fireflies (Audit 2 §2, §9).
- **[VALIDATED]** it's already unreferenced in the render tree, so removal is deleting dead code, not re-architecting a content gate.
- Demoting it to the surprise catalog was considered and rejected: the 29-effect catalog is deliberately lightweight DOM mutations (`start()`/`stop()`), and the catalog's own design comment says a full-viewport arrival "is not a surprise, it is a fault." BombIntro's throw/blast/particle sequence is a bigger, costlier, more attention-grabbing system than anything else in that catalog, and reworking it to be a lightweight, combinable, non-blocking opt-in effect would be more engineering than the payoff is worth for a component nothing currently uses.

### 2.3 living-river
**Decision: default-on for desktop + capable-GPU + motion-allowed visitors, replacing section-scenery for the whole page for that visit; never mobile; respects reduced-motion.**

Concrete gating (all must hold, evaluated client-side since WebGL/pointer capability isn't knowable at server render time):
1. `prefers-reduced-motion: no-preference` — reuses the exact policy already correct sitewide.
2. `pointer: fine` — the same media query already correctly excludes touch for card-tilt; reused here to exclude phones and tablets, not just "small screens."
3. A WebGL2 context is actually obtainable — `gl/context.ts` already returns `null` rather than throwing; that null becomes the signal to fall back, not to error.
4. Optional soft check: `navigator.deviceMemory` if present and `< 4`, treat as low-power and fall back (many capable desktops don't expose this API at all — absence should not disqualify).
5. Admin's Firestore flag remains the top-level kill switch — when it's off, nobody gets it, unchanged from today. This phase's job is to flip its practical meaning from "on for nobody until an admin finds the toggle" to "on for every visitor whose device can actually carry it," and to default that Firestore flag to **on** going forward.

**Why not hero-only:** the prompt's own menu lists it as an option, but this plan recommends against it. living-river's current architecture is a full-document backdrop with momentum-aware scroll response tuned against the *entire* page journey (per its README — resize-vs-scroll bugs were fixed by "actually simulating a journey," not eyeballing a boxed hero). Re-scoping it to a hero-only container would mean re-deriving that scroll/camera math against a false page boundary — real re-engineering of something the audits told us is already careful and correct, not a config change. Device-gating instead achieves the goal ("appropriate visitors actually experience it") without touching the tuned renderer at all.
**Why not "discoverable toggle" instead:** Audit 2's fallback suggestion. Rejected as the primary path because a self-serve toggle still requires a visitor to notice and act on it — it doesn't solve "the best engineering in the repo is invisible by default." Default-on-for-capable-devices does.

### 2.4 circuit-road
**Decision: delete it completely.**
Redundant with section-scenery (same visual role, weaker on every axis per Audit 2 §2/§4), already off by default, structurally isolated (confirmed), missing from the conflicts graph (confirmed), z-index outside the registered `LAYER` shelf, incomplete reduced-motion gate on the board build. No distinct creative point of view survives the comparison in Audit 2 §4. Fixing it in place (conflicts entry + z-index shelf + reduced-motion gate) is more work for a system that duplicates a role section-scenery already fills better — deletion is the smaller, safer change and removes a maintenance liability outright rather than making an unwanted system merely correct.

### 2.5 Mobile
| Context | Section-scenery | living-river | circuit-road | BombIntro | Reduced-motion |
|---|---|---|---|---|---|
| Desktop, capable GPU | On (or replaced by living-river per §2.3) | On (default, gated) | Deleted | Deleted | N/A here |
| Tablet | On, pointer-driven interactivity naturally absent (no pointer:fine) | Off (pointer:fine gate fails) | Deleted | Deleted | — |
| Mobile | On, **lower-density tier**: fewer stalks/nodes/particles, same silhouette, no pointer-reactive branch (touch already gets the existing decaying-presence/noise-wander fallback — no change needed there) | Off, unconditionally, regardless of admin flag | Deleted | Deleted | — |
| Low-power (deviceMemory heuristic, or engine's own frame-cost measurement) | Starts at the engine's lowest quality tier immediately rather than stepping down after the fact | Off | Deleted | Deleted | — |
| Reduced-motion (any device) | Renders nothing (existing policy) | Renders nothing (existing policy) | Deleted | Deleted | Governs everything else too — CSS entrance/hover collapse via existing `globals.css` rule |

---

## 3. Motion Hierarchy (final spec)

**Level 1 — Signature**
living-river (capable desktop visitors) — the one thing this site should be known for. Section-scenery's "six scenes, one engine" idea is the graceful fallback signature for everyone who doesn't qualify for living-river, and should be treated as first-class, not a downgrade — it's already good enough to carry the site alone.

**Level 2 — Supporting**
Section-tone crossfade + scenery scene-switch (wayfinding), ScrollVeil rise/hold/fade, the work-scene's one-shot arrival (deserves real content to arrive at — depends on Phase 1), header hide-on-scroll + active-nav pill.

**Level 3 — Micro**
Card-tilt, project-card hover-reveal, button/nav hover states, toggle-knob, dialog entrance/exit.

**Level 4 — Static**
Contact form fields, tech-tag pill contents (marquee container may move; individual pills don't animate), footer, the entire admin dashboard (already correctly "flat and quiet").

**Novelty / Opt-in (its own lane, never baseline)**
The 29-effect surprise catalog, randomly or individually pinned. BombIntro is removed, not relocated here — see §2.2 for why it doesn't fit even this lane as-is.

---

## 4. Motion Budget

- **Hard rule (already architecturally enforced via the conflicts graph):** exactly one full-viewport decorative system at a time. Never section-scenery + living-river together; never circuit-road at all (deleted).
- **With living-river running:** nothing else full-viewport. Sprite layer + shader are the whole backdrop. CSS ambient-glow may still carry the section tint at low opacity if it doesn't visually compete — verify during Phase 4, don't assume.
- **With section-scenery running:** ambient-glow blobs, Framer entrance/scroll animations, hover micro-interactions. Same as today — no change.
- **Disabled on mobile, unconditionally:** living-river, circuit-road (deleted anyway), any pointer-only surprise effect (already correctly gated).
- **Reduced-motion disables:** every canvas/WebGL/SVG-motion system outright (renders nothing), all CSS entrance/hover transitions (existing blanket rule).
- **Low-power devices downgrade:** section-scenery starts at its lowest quality tier instead of stepping down reactively; living-river is excluded entirely rather than downgraded (a phone-class GPU has no headroom to fall back into, per Audit 2 §7).
- **Concurrent rAF loops, target state:** one (section-scenery's shared loop, or living-river's single clock) plus per-hover card-tilt instances that exist only while a pointer is over a card. No independent competing loops (circuit-road's ball loop is removed by deletion).

---

## 5. Device Strategy

| Device class | Backdrop | Interactivity | Notes |
|---|---|---|---|
| Desktop, capable GPU, motion allowed | living-river (default) | Cursor scatters birds, momentum-aware scroll | Falls back to section-scenery if any gate in §2.3 fails |
| Desktop, motion allowed, capability check fails | section-scenery | Pointer-reactive per scene | Same as today |
| Tablet | section-scenery | No pointer-driven interactivity (no fine pointer) | No change from current correct behavior |
| Mobile | section-scenery, lower-density tier | Touch presence fallback (existing, correct) | living-river force-off regardless of admin flag |
| Low-power / low deviceMemory | section-scenery, lowest quality tier from first frame | — | Applies on any form factor |
| Reduced-motion, any device | Nothing renders | Static content only | Unchanged, already correct |

---

## 6–7. Complete Phased Implementation Roadmap (with files per phase)

Ordering follows content-quality-first: nothing else matters if the Work section still looks broken. Then remove liabilities, then promote the signature piece, then mobile/polish/performance last since they depend on what survives the earlier phases.

### Phase 1 — Fix visible content quality
**Goal:** Work section shows real cover imagery; hover-reveal becomes visible; no placeholder-monogram cards in the default demo/seed state.
**Why it matters:** P0 per Audit 2 — the section whose entire job is "prove I can build things" currently shows two empty boxes. Everything downstream (hover-reveal, work-scene's Level-2 "arrival" storytelling) depends on this.
**Files likely touched:** `src/lib/constants/demo-content.ts`, `src/lib/firebase/repositories/projects-repository.ts` (or wherever `featuredImage` is resolved for read), possibly a small new helper alongside `src/features/repo-imagery/cover.ts` for demo-specific param generation.
**Files that should NOT be touched:** `src/features/repo-imagery/{github.ts,harvest.ts,stock.ts,suggest.ts,actions.ts,panel.tsx}` (the harvest/admin-flow half is already correct and unrelated to seed data), `project-form.tsx` (already wired), `project-card.tsx` (already correct — placeholder/reveal branching logic is good, don't rewrite it).
**Implementation requirements:** Generate covers server-side, not client-side; two distinct covers per demo project (cover + one gallery image) so hover-reveal has content; respect `cover.ts`'s existing length caps and variant enum rather than inventing new params.
**UX requirements:** Cover must look intentional (title/subtitle/meta populated, not blank), not another placeholder.
**Accessibility requirements:** No change to existing `alt=""` decorative pattern — cover images remain decorative, the card title carries the accessible name (already correct in `project-card.tsx`).
**Performance requirements:** Generated covers are rendered on request at `/api/repo-imagery/cover` — confirm this doesn't become an uncached hot path for the two demo cards on every page load (check response caching headers on that route; don't change its signing logic).
**Validation/testing requirements:** Visual check on `/` (Work section) and `/projects/[slug]` case-study header, desktop + mobile, light + dark theme (`hueForRepo`/theme param must render correctly in both). Confirm hover/focus reveal actually crossfades now that a second image exists.
**Definition of done:** No demo/seed project renders the ghost-monogram placeholder in the default state; hover-reveal visibly crossfades on at least one card.
**Risks / must NOT accidentally change:** Do not touch the real-repo harvest path, the HMAC signature scheme, or `project-card.tsx`'s placeholder-fallback branch itself — that branch should remain correct and in place for any *future* project a real user adds without a cover, it's just no longer hit by the shipped demo data.

### Phase 2 — Remove BombIntro
**Goal:** Delete BombIntro entirely; confirm no content-delaying animation remains anywhere in the default shell.
**Why it matters:** Tonal mismatch with the site's identity (Audit 2 §2, §9); P1. **[VALIDATED]** it's currently dead code, so this phase is materially lower-risk than the audits assumed when written.
**Files likely touched:** `src/components/sections/section.tsx` (remove the unused import), `src/components/motion/bomb-intro.tsx` (delete file). Check for any lingering references in docs/comments (`docs/audit1.md`/`audit2.md` mention it descriptively — no action needed, they're historical records).
**Files that should NOT be touched:** `scroll-veil.tsx`, `reveal.tsx`, `ambient-background.tsx`'s own IntersectionObserver — these are the three legitimate "in view" mechanisms Audit 1 flagged as *scattered but not buggy*; this phase removes one contributor to that scatter (BombIntro's `onViewportEnter`) by deleting it, not by consolidating the other two (that's Phase 6).
**Implementation requirements:** Delete the file and the import; run a full-repo grep for `bomb-intro`/`BombIntro` afterward to confirm nothing else references it (the surprise catalog and admin dashboard do not, per this session's validation).
**UX requirements:** No visible regression — since nothing currently renders it, there is nothing to visually verify beyond "site still loads."
**Accessibility requirements:** N/A — removes the one documented accessibility question mark (content-delay timing) outright.
**Performance requirements:** Confirm bundle no longer includes the bomb-intro module (it likely already doesn't reach the client meaningfully since it's unused, but removing the file guarantees it).
**Validation/testing requirements:** `grep -r "bomb-intro\|BombIntro" src` returns nothing; build passes; every section still renders content immediately on scroll-into-view.
**Definition of done:** File deleted, import removed, no other reference remains, build clean.
**Risks / must NOT accidentally change:** Don't touch `Section`'s `ScrollVeil` wrapping or its `exit`/`tone` props while removing the dead import — the goal is a one-line-plus-one-file deletion, not a `Section` rewrite.

### Phase 3 — Clean up redundant scenery
**Goal:** Delete circuit-road entirely; delete the dead `river-scenery` folder.
**Why it matters:** Audit 2's explicit recommendation — circuit-road is redundant, structurally inconsistent with the layer discipline the rest of the system holds itself to; `river-scenery` is fully superseded dead code (its import/fallback branch is already gone from `layout.tsx` this session).
**Files likely touched:** delete `src/components/motion/circuit-road.tsx`; remove its mount line and import from `src/app/(site)/layout.tsx`; remove its `SiteLayer` entry from `src/components/surprise/site-layers.ts`; remove its row from wherever `site-layer-toggles.tsx` sources rows (likely the admin dashboard page passing `SITE_LAYERS`); delete `src/features/river-scenery/` entirely; check `src/lib/firebase/repositories/scenery-repository.ts` for a `circuitRoad`/legacy field that can be left as harmless orphaned data (don't attempt a Firestore migration).
**Files that should NOT be touched:** `src/features/section-scenery/**` (this is the system circuit-road is redundant *with* — no changes here), `src/features/living-river/**`.
**Implementation requirements:** Remove all four touch points cleanly (component, layout mount, registry entry, admin row) so the admin dashboard doesn't show a dangling toggle for a deleted feature.
**UX requirements:** Admin dashboard's "Site scenery" list should show only `section-scenery`, `ambient-glow`, `living-river` afterward — verify visually.
**Accessibility requirements:** N/A — removes the one known incomplete reduced-motion gate (the board-build path) by deleting the whole system.
**Performance requirements:** Confirm no dangling rAF loop or ResizeObserver remains registered anywhere after deletion.
**Validation/testing requirements:** Full-repo grep for `circuit-road`/`CircuitRoad`/`river-scenery` after deletion; admin dashboard loads without a broken toggle row; public site loads with no console errors.
**Definition of done:** Both folders gone, both mounts gone, both registry entries gone, admin dashboard clean, no stray references.
**Risks / must NOT accidentally change:** Do not touch `living-river`'s registry entry or its `conflicts: ["section-scenery"]` line while editing `site-layers.ts` — only the `circuit-road` entry is removed.

### Phase 4 — Promote living-river
**Goal:** Implement the device/capability gate from §2.3 so capable desktop visitors get living-river by default; section-scenery remains the correct fallback for everyone else.
**Why it matters:** The most technically distinctive work in the repo is currently invisible to 100% of real visitors (Audit 2 §4/§9). This is the single highest-leverage "signature experience" fix.
**Files likely touched:** `src/app/(site)/layout.tsx` (decision point for which backdrop mounts), a new small client-side capability-detection module (likely inside `src/features/living-river/` or `src/components/surprise/site-layers.ts`'s consuming code), `src/lib/firebase/repositories/scenery-repository.ts` (flip the stored/default value for `livingRiver` to `true` if going with "admin default on, device gate decides the rest"), `src/components/surprise/site-layers.ts` (`defaultOn: true` for `living-river`).
**Files that should NOT be touched:** anything inside `src/features/living-river/gl/`, `sprites/`, `core/` — the renderer, camera, lighting, and wave-table math are already correct and carefully tuned per its README; this phase is purely about *who gets it mounted*, never *how it renders*.
**Implementation requirements:** Capability check must run client-side before commit to avoid an SSR/CSR mismatch (Next.js hydration concern) — likely a small client wrapper that defaults to `section-scenery` on first paint and swaps only after confirming `pointer:fine` + `prefers-reduced-motion:no-preference` + a real WebGL2 context, to avoid a flash-then-swap that reads as janky. Reuse `gl/context.ts`'s existing null-return rather than writing a second WebGL probe.
**UX requirements:** The swap (if any visible transition happens) should not cause a layout shift or a visible "pop" — if a flash-of-wrong-backdrop can't be avoided cleanly, prefer deciding before first paint using a synchronous capability check (`matchMedia` is synchronous; only the WebGL context probe needs care) over a post-mount swap.
**Accessibility requirements:** Reduced-motion gate must be checked identically to how it's checked elsewhere (`useMotionPreference`/`prefers-reduced-motion` — reuse the existing hook, don't write a second reduced-motion detector).
**Performance requirements:** living-river's WebGL modules should only download for visitors who pass the gate — confirm this is actually code-split (`next/dynamic`) and not bundled unconditionally; this was flagged as unconfirmed in Audit 1 §7/Audit 2 §8 and should be checked, not assumed, as part of this phase.
**Validation/testing requirements:** Manual test matrix — desktop+mouse+motion-allowed (should get living-river), same but reduced-motion (should get section-scenery, nothing WebGL), touch device pretending fine pointer is absent (should get section-scenery), admin flag forced off (should get section-scenery for everyone regardless of device).
**Definition of done:** A capable desktop visitor with no explicit admin override sees living-river without visiting the admin dashboard; every non-qualifying visitor sees section-scenery exactly as today; admin off-switch still works as an absolute override.
**Risks / must NOT accidentally change:** Do not modify the conflicts logic in `layout.tsx` beyond the gating decision itself (the "exactly one river" comment and `pinned` filtering logic for `river-path` must survive unchanged). Do not touch `core/water.ts`'s shared wave-table or `gl/shaders.ts`.

### Phase 5 — Mobile motion system
**Goal:** Implement the lower-density mobile tier for section-scenery per §2.5; confirm living-river's mobile force-off from Phase 4 actually holds regardless of admin state.
**Why it matters:** Per Audit 2 §7, mobile currently gets a scaled-down desktop experience rather than a deliberately designed one — motion reads more prominent per pixel on a smaller, closer screen.
**Files likely touched:** `src/features/section-scenery/engine/loop.ts` (quality-tier entry point), `src/features/section-scenery/scenes/*.ts` (density parameters per scene, if they're not already exposed through the existing quality-scaling mechanism).
**Files that should NOT be touched:** the shared engine's core algorithms (`noise.ts`, `math.ts`, `approach()`-style easing) — this phase tunes *parameters* (density/particle counts) through the engine's existing quality-scaling hooks, it does not rewrite the engine.
**Implementation requirements:** Use the engine's existing "quality only falls, never climbs back" infrastructure to start mobile at a lower density tier from the first frame, rather than bolting on a separate mobile code path.
**UX requirements:** Same silhouette per scene at lower density — a visitor comparing desktop and mobile screenshots side by side should recognize each scene as the same idea, just quieter.
**Accessibility requirements:** No change to reduced-motion behavior — this phase only affects the motion-allowed density tier.
**Performance requirements:** Verify actual battery/GPU improvement via a real (non-headless) profile on a mid-range Android target, not just a parameter change taken on faith.
**Validation/testing requirements:** Visual comparison desktop vs. mobile per scene; confirm living-river remains off on mobile even with the admin flag on (regression test for Phase 4's gate).
**Definition of done:** Mobile renders a visibly lower-density but recognizably identical scene per section; living-river never mounts on a touch-primary device.
**Risks / must NOT accidentally change:** Don't let "lower density" become "different scene" — preserve each scene's actual visual idea (swell, field, network, rails, threads, fireflies), just fewer elements.

### Phase 6 — Motion-system polish
**Goal:** Card-tilt's one-frame transform-ownership race, shared easing curve unification, and (optionally) consolidating the three "in view" mechanisms now that BombIntro's contributor is gone.
**Why it matters:** Small, previously-identified correctness/consistency gaps (Audit 1 §5, Audit 2 §2/§10 items 7–8) — not urgent, but cheap to fix once the higher-impact phases are done and stable.
**Files likely touched:** the card-tilt module (confirm exact path at phase start), `src/components/ui/button.tsx`, `project-card.tsx`, nav link components, `mobile-menu.tsx` trigger (easing unification onto the shared `EASE_OUT` curve from `variants.ts`).
**Files that should NOT be touched:** `variants.ts` itself should not gain new tokens for this — the whole point is consolidating onto what already exists there.
**Implementation requirements:** Move `data-card-tilt` stamping from next-rAF to synchronous `pointerenter`; replace Tailwind-default easing classes with the shared curve where five different curves currently claim one "personality."
**UX requirements:** No perceptible change in feel — this is a correctness/consistency fix, not a redesign.
**Accessibility requirements:** No change.
**Performance requirements:** No regression — synchronous stamping on `pointerenter` is strictly cheaper than a rAF round-trip.
**Validation/testing requirements:** Fast-hardware manual test that hover transition and tilt no longer both claim `transform` in the same frame; visual diff of hover-transition timing across button/card/nav/mobile-menu before and after.
**Definition of done:** One easing curve, one duration system, actually used everywhere `variants.ts` claims it is; card-tilt race closed.
**Risks / must NOT accidentally change:** Do not touch the frame-driven CSS-custom-property architecture of card-tilt itself — only the timing of when the attribute is stamped.

### Phase 7 — Performance
**Goal:** Verify code-splitting of living-river/surprise-catalog (flagged as unconfirmed in both audits), confirm section-scenery's loop pauses on `document.hidden` (living-river's is confirmed, section-scenery's parity is unconfirmed), real (non-headless) DevTools/Lighthouse profiling pass.
**Why it matters:** Every performance claim in both audits about "adaptive quality" and "no unnecessary render loops" is based on code reading or an unreliable headless fps sample (Audit 2 explicitly flags its own ~12.8fps headless number as unreliable) — this phase replaces assumption with measurement.
**Files likely touched:** likely none, or `next/dynamic` wrapping around `LivingRiverBackdrop`/`SiteAnimations`'s surprise-effect imports if the bundle analysis shows they aren't already split; possibly a one-line guard added to `section-scenery/engine/loop.ts` if the `document.hidden` pause is confirmed missing.
**Files that should NOT be touched:** don't preemptively add `next/dynamic` everywhere — only where the bundle analyzer actually shows an unconditional import.
**Implementation requirements:** Run a bundle analyzer pass before changing anything; only act on confirmed findings.
**UX requirements:** N/A.
**Accessibility requirements:** N/A.
**Performance requirements:** Concrete budget — living-river's shader/sprite modules and the surprise catalog should not appear in the initial JS payload for a visitor who never triggers them.
**Validation/testing requirements:** Bundle analyzer output before/after; real Chrome DevTools Performance recording on the actual dev machine (not headless Playwright) for hero+scenery+glow idle state; confirm the `document.hidden` pause behavior for both loops via manual tab-switch test.
**Definition of done:** A written record (can live in `docs/`) of actual measured bundle sizes and idle frame cost, with any confirmed gaps closed.
**Risks / must NOT accidentally change:** Don't let a bundle-splitting change alter load-order in a way that causes a visible flash of the wrong backdrop — coordinate with Phase 4's capability-gate work if timing overlaps.

### Phase 8 — Visual polish
**Goal:** Header translucency fix, and any remaining spacing/typography/hierarchy items surfaced live in Audit 2.
**Why it matters:** P2 — confirmed live (Audit 2 §1b): body copy visibly ghosts through the sticky header at `bg-surface/80`.
**Files likely touched:** `src/components/layout/site-header.tsx`.
**Files that should NOT be touched:** the header's off-screen-while-tabbable behavior (`y: "-110%"`) — Audit 2 found no accessibility violation there, it's an intentional, documented pattern; don't "fix" it as a side effect of the opacity change.
**Implementation requirements:** Raise `bg-surface/80` to `/92` or higher, or reduce blur radius — pick whichever reads better against both themes' busiest section (Skills, where the bleed-through was confirmed).
**UX requirements:** Header should read as solid at a glance while scrolling past dense content in both light and dark themes.
**Accessibility requirements:** No regression to existing keyboard-tab-order behavior.
**Performance requirements:** N/A (a CSS opacity/blur value change).
**Validation/testing requirements:** Scroll past the About stats grid in both themes, confirm no ghosting.
**Definition of done:** Header opacity confirmed fixed live, matching the exact repro Audit 2 documented.
**Risks / must NOT accidentally change:** Nothing else in `site-header.tsx` — this is a one-value change, resist scope creep into a header redesign.

---

## 8. Testing Strategy

- Each phase ships independently testable and revertible (single git commit or small commit series per phase; no phase depends on code from a later phase).
- Visual verification happens live in the actual dev server (per Audit 2's Playwright-against-running-dev-server method), desktop + mobile, light + dark, not from reading code alone.
- Any performance claim gets a real (non-headless) DevTools/Lighthouse pass before being treated as fact — Audit 2's own explicit caveat about its headless fps number is the standing lesson here.
- After each phase: full-repo grep for the deleted symbol (BombIntro, CircuitRoad, river-scenery) to catch stragglers before moving on.
- Admin dashboard gets a manual pass after Phases 3 and 4 specifically (both touch the "Site scenery" toggle list).

## 9. Definition of Done (whole project)

- No empty-looking project cards in the default demo/seed state.
- No unnecessary animation competing for attention (BombIntro and circuit-road gone).
- No content delayed by decorative animation anywhere.
- One coherent visual language — the "weather" metaphor, consistently.
- living-river is actually experienced by capable, motion-allowing desktop visitors without any admin action.
- section-scenery remains the efficient, correct baseline for everyone else.
- Mobile has its own deliberate, lower-density motion strategy — never a stripped-down desktop experience.
- Reduced-motion renders nothing, sitewide, without exception.
- Animation never becomes the site's purpose — signature experience is one deliberate breath, not a showcase.
- Performance stays within a measured (not assumed) budget: one full-viewport system at a time, heavy systems code-split.
- No new dependencies — every phase above is achievable with the existing stack (`motion`, hand-rolled Canvas2D/WebGL, no R3F/GSAP/Three.js needed anywhere in this plan).

## 10. Risks and Guardrails

**Protect, do not rewrite:**
- `section-scenery`'s shared engine (`engine/loop.ts`, `noise.ts`, `math.ts`) — noise-based motion, `approach()` damping, one shared rAF loop.
- living-river's renderer (`gl/`, `sprites/`, `core/`) — shared wave-table, camera inverses, back-lit lighting model.
- Card-tilt's frame-driven CSS-custom-property architecture (Phase 6 only touches stamp *timing*, never the mechanism).
- The hover-reveal pattern in `project-card.tsx` (CSS-only, `motion-safe:`-gated, keyboard-correct) — Phase 1 only needs to give it real images, not new logic.
- The layer conflict system (`site-layers.ts`'s `conflicts`/`conflictsWith`) — Phases 3/4 add and remove entries, never change its resolution logic.
- The reduced-motion philosophy (render nothing, don't slow down) — already correct everywhere except the now-deleted circuit-road gap.
- The section-tone system (`@property`-registered, oklab interpolation) — untouched by every phase above.

**Cross-phase risks:**
- Phase 4 (living-river promotion) is the only architecturally nontrivial phase — its client-side capability gate must not introduce an SSR/hydration mismatch or a visible backdrop flash. Budget real testing time here specifically.
- Phases 3 and 4 both touch `site-layers.ts` and the admin toggle list — sequence them in order (delete circuit-road first, then promote living-river) so the admin dashboard is never in a half-migrated visible state.
- Do not let Phase 1's imagery work reach into `repo-imagery`'s harvest/signing internals — that half is confirmed already correct and finished; scope creep there risks the one part of this system that's genuinely done.

---

No code has been implemented. This document is the approved-pending plan; execution begins phase by phase once approved, starting with Phase 1.
