Step 2 — Senior Visual, Motion & 3D Direction Audit
Grounded in: the full living-river/README.md, section-scenery/README.md, and docs/design-research/section-scenery-3d-plan.md (all read in full this pass), bomb-intro.tsx, site-layers.ts, site-layer-toggles.tsx, ambient-background.tsx, the current layout.tsx/project-card.tsx diffs, the surprise-effects catalog (29 files), plus everything already verified in Step 1 (circuit-road.tsx, card-tilt.ts, variants.ts, globals.css). Live-verified via Playwright against the running dev server at its actual default state — desktop + mobile screenshots of hero/about/skills/work/contact, a hover pass, and a DOM probe confirming what's actually mounted.

Ground truth that changes the frame for this whole audit: at today's defaults, only two things render — SectionScenery (one canvas) and the CSS ambient-glow blobs. living-river and circuit-road are both off by default and mutually exclusive with each other and (for living-river) with section-scenery, via site-layers.ts's conflicts system. My probe confirmed exactly one <canvas> in the DOM on both desktop and mobile. So the "three backdrops stacking" concern I'd have raised from reading code alone doesn't happen in production today — it's a state the admin panel can produce, not the shipped experience. That's the single most important fact this audit is built on.

1. Visual Identity
What's working, and it's genuinely good:

Typography: Geist-family sans for UI/body, Instrument Serif italic for the two "voice" moments (job title, marquee statement) — a disciplined two-family system, used consistently everywhere I looked.
The recurring glow-disc motif (sun in hero, moon in contact) is a real piece of art direction, not just a color scheme. It closes a loop across the page — confirmed live: warm circle bottom-right in hero, warm circle mid-frame in contact. That's the kind of detail that reads as intentional to a visitor even if they can't articulate why.
Section-tone system (--tone/--tone-soft, @property-registered, oklab interpolation) is unusually sophisticated for what's ultimately a background tint — six on-brand hues (purple/cyan/crimson/green/blue + hero's warm base), correctly implemented for both light and dark, and it feeds every decorative layer from one source of truth.
The about paddy-field scene, live: vertical stalks rising from the fold, biased right, genuinely reads as "growth" at a glance, in greyscale, at a distance — it passes the design doc's own test.
What's weaker:

1a. Placeholder project cards undercut the site's most important section.
Confirmed live, desktop and mobile, default state: both visible project cards ("Atlas," "Beacon") render a full-height grey grid with a single ghost-monogram letter. This is the single highest-visibility failure on the page — the section whose entire job is "prove I can build things" currently shows two empty boxes.
Why it feels wrong: it's not a stylistic weakness, it reads as broken.
Severity: P0.
The fix already exists in-repo and hasn't been wired to data yet — see src/features/repo-imagery/, a whole feature (harvest.ts, cover.ts, suggest.ts, github.ts) built specifically to pull cover images from a project's GitHub repo. This isn't a "build something new" recommendation, it's "finish connecting what's already built to the seed/demo projects."
File: src/components/projects/project-card.tsx (placeholder branch), data layer for project.featuredImage, src/features/repo-imagery/.

1b. Header translucency lets body copy ghost through, sometimes legibly.
Confirmed live in the Skills screenshot: Sample figure — set your own in the admin panel (from the About stats grid, fully readable) sits ghosted directly under the sticky header as the page scrolls past it. bg-surface/80 backdrop-blur-xl is doing real work but not quite enough at 80% opacity.
Severity: P2 (polish, but it's now visually confirmed rather than inferred).
Fix: raise to /92+ or reduce blur radius.
File: src/components/layout/site-header.tsx.

1c. Art direction is more "curated and restrained" than "premium and distinct." Nothing here reads as generic-template — the tone system alone rules that out — but nothing yet reads as a signature, either. The strongest, most distinctive visual idea on the site (living-river's ray-marched, back-lit water with a real day-cycle) is off by default and the thing visitors actually see is the calmer, more conventional canvas backdrop. See §4/§9.

2. Motion Design — system by system
System	What it is	Assessment
section-scenery	2D canvas, one shared engine, six per-section scenes, on by default	Valuable, keep. Well-engineered (noise not sines, approach() not *0.1, one shared rAF loop, damped-vs-offset force distinction documented per-primitive). This is the site's actual current visual backbone and it's doing its job.
living-river	WebGL ray-marched water + 2D sprite layer, off by default, admin-only	Valuable but under-exposed. By a wide margin the most technically and creatively ambitious thing in the codebase — shared wave-table between shader and sprite math, back-lit lighting model, momentum-aware scroll response, resize-vs-scroll bug fixes documented from actually simulating a journey rather than eyeballing frames. It is currently a hidden admin toggle, not part of the experience anyone encounters. This is a strategic mismatch, not a code problem — see §4/§9.
circuit-road	SVG "motherboard" trace + chasing glow ball, off by default, admin-only	Redundant with section-scenery, keep off. It's a full-document-height decorative system competing for the same visual role scenery already fills, has a hardcoded z-index: -9 that sits outside the LAYER shelf registry site-layers.ts otherwise documents carefully (-8/44/45/46), and its reduced-motion handling is incomplete — the ball's step loop checks prefers-reduced-motion, the board's SVG construction (buildField/buildBoard, re-run on resize) does not, so a reduced-motion visitor who somehow gets this layer on still pays full build/measure cost for a static board. Given it's already off by default and conflicts conceptually with scenery, recommend formalizing that as a real conflicts: ["section-scenery"] entry (it currently has none) rather than leaving it a soft convention.
card-tilt	Pointer-driven 3D tilt on project cards, fine-pointer only	Good, keep as a Level-3 micro-interaction. Frame-driven CSS custom properties, not JS transform strings; correctly excludes transform from the card's own CSS transition list. One real gap: data-card-tilt is stamped inside the next rAF rather than synchronously on pointerenter, so there's a one-frame window where the CSS :hover transition and the tilt engine can both claim transform. Small, worth a one-line fix.
cursor effects (cursor-trail.ts, magnetic-cursor.ts)	Surprise-catalog effects	Correctly scoped as opt-in novelty, not baseline site behavior — they live in the 29-file surprise catalog, rolled randomly by the Surprise button, not part of normal browsing. Right call; leave them there.
BombIntro	Section-entry gag: a cartoon bomb thrown in, explodes, content fades in after	The single most questionable animation on the site. See below.
surprise effects (29 files: confetti, snowfall, glitch-ink, scanlines, starfield, grid-warp, etc.)	Random novelty roll from a button	Correctly isolated — effect.ts's own comment states the design intent precisely: "a full-viewport WebGL scene arriving unannounced is not a surprise, it is a fault," which is why living-river/circuit-road/section-scenery are excluded from the random roll and only toggled deliberately. This is good self-aware design. The catalog is large (29 effects) for what's fundamentally an easter egg — not a defect, but worth asking whether maintaining 29 novelty effects is the best use of engineering time versus deepening the 1–2 things that should be signature (§9).
page/section transitions	Reveal, Stagger, ScrollVeil	Solid, consistent, already audited in Step 1 — no new findings.
scroll-based effects	ScrollVeil's 4-stop rise/hold/fade, tone cross-fade, scenery cross-fade	Coherent; the design doc explicitly reasoned about the scenery cross-fade's easing pair (smoothstep01, chosen because it's the only common pair that sums to exactly 1, replacing an easeOutCubic pair that "bulged bright halfway through") — genuinely careful work.
hover interactions	Nav links, buttons, project-card hover-reveal	The new hover-reveal (project-card.tsx, this session's diff) is well-built: CSS-only crossfade, motion-safe: gated, keyboard-accessible via group-focus-within, decorative second image never a tab stop. Good pattern, but it's presently invisible in the live site because none of the sample projects have a second gallery image distinct from the thumbnail — same root cause as 1a.
On BombIntro specifically: a cartoon bomb thrown from a random screen edge, exploding into colored sand, playing once per section on first scroll-into-view. It's well-built (randomized throw side/timing, tone-colored shockwave, particle physics), but:

Why it feels wrong: it's tonally disconnected from the rest of the site. Everything else on this page — the paddy field, the stitched thread, the fireflies, the water — pulls from one coherent, quiet, slightly poetic visual vocabulary (documented explicitly in the design plan as "the Bangladeshi motif vocabulary"). A cartoon bomb with a fuse and cel-shaded highlight dots is a completely different register — closer to a mobile game's level-complete animation than a senior developer's portfolio.
It's also a content-delaying gate: real section content doesn't fade in until the blast finishes (throw 0.9–1.3s + blast 0.7–1s ≈ up to 2.3s), on every section it wraps, the first time each is scrolled to.
Severity: P1 — not broken, but actively working against the "premium and cohesive" goal the audit asked me to evaluate against.
Recommendation: either retire it or demote it to something explicitly opt-in (surprise-catalog territory), not a default gate in front of real content.
File: src/components/motion/bomb-intro.tsx. (Need to confirm where it's actually wired — section.tsx: referenced bomb-intro per an earlier grep; worth checking whether it wraps every <Section> or is scoped narrower before deciding removal vs. narrowing.)
3. Motion Hierarchy
Level 1 — Signature (1–2 things a visitor should remember)

living-river, if promoted (see §4/§9) — nothing else on the site comes close to its craft or novelty.
Failing that promotion, section-scenery's "six different animations, one engine" idea is the fallback signature — it's already unique enough (the greyscale test the design doc set for itself is a genuinely good bar, and it passes).
Today, neither is positioned as memorable, because the actually-shipped experience treats section-scenery as ambient wallpaper (aria-hidden, low-key, easy to miss against the content) rather than a call-out.
Level 2 — Supporting (reinforces navigation/storytelling/hierarchy)

Section-tone cross-fade + SectionScenery's per-section scene switch (the two together are the wayfinding signal — color and motion both say "you've moved to a new section").
ScrollVeil rise/hold/fade.
The work scene's one-shot "arrival" (rails converging, settling) — this is doing real storytelling work ("you've arrived at the proof") and deserves to stay Level 2, possibly promoted with the fix in §1a so it has something to arrive at.
Header hide-on-scroll, active-nav pill.
Level 3 — Micro-interactions

Card-tilt, project-card hover-reveal, button/nav hover states, toggle-knob, dialog entrance.
Level 4 — Static (should stay calm)

Contact form fields, tech-tag pills' content (their marquee motion is fine, but the pills themselves shouldn't animate individually), footer, admin dashboard entirely (already explicitly "flat and quiet" per the layout comment — correct).
Where BombIntro and the 29-effect surprise catalog sit: neither belongs in this four-level hierarchy at all — they're a fifth, separate lane ("novelty/opt-in"), and BombIntro is currently miscategorized as if it were Level 2 (it gates real content) when its actual tone puts it closer to the surprise catalog.

4. 3D / Depth Direction
Comparing the four systems directly, as asked:

living-river: the only actually 3D thing on the site — ray-marched geometry, a real camera with project/unprojectToWater inverses, real lighting (key/fill/ambient/rim/AO/SSS/crepuscular rays). This is not a gimmick; it's a small, disciplined renderer.
section-scenery: 2D canvas with depth illusion (parallax bands, converging rails, layered stalks) — no real 3D, and it doesn't need any; it achieves depth cheaply through composition.
river-scenery (the old CSS/DOM predecessor to living-river): now fully superseded — the current layout.tsx diff removed its import and its fallback branch entirely. It's dead code on disk, not a live alternative. Worth an explicit decision (delete or keep as reference) rather than leaving it ambiguous.
circuit-road: SVG, flat, not depth-illusioned at all beyond a glow. The weakest of the four on its own terms.
card depth/tilt: real (if small) 3D — CSS transform: rotateX/rotateY driven by pointer position. Working correctly at the micro-interaction scale it's meant for.
My recommendation, directly answering the prompt's menu: keep the current approach and improve it — do not introduce more 3D, but do rebalance which existing 3D system is the default-visible one.

The site should not go further into "more actual 3D geometry" (no R3F, confirmed by the codebase's own repeated, explicit non-negotiable, and I'm not overriding that). It should also not stay primarily-2D-with-depth-illusion as its ceiling — it already built something better than that (living-river) and is choosing not to show it. Concretely:

section-scenery should remain the baseline — it's cheap, it's per-section, it's the right default for a page most visitors will scan quickly.
living-river should become the deliberate, signature moment — not necessarily "always on everywhere," but surfaced somewhere a visitor will actually encounter it (e.g., default-on for the hero specifically, or a prominent, discoverable toggle rather than an admin-only Firestore flag with no visitor-facing affordance at all). Right now the most impressive engineering in the repo is invisible to 100% of visitors unless an admin has opted it in.
circuit-road is the one system I'd genuinely consider removing outright rather than improving — it doesn't have a distinct creative point of view the other two don't already cover better, and its z-index/reduced-motion gaps are exactly the kind of rough edge that shows up when a system is a "nice to have I tried once" rather than a maintained part of the vocabulary.
5. Motion Budget
Context	What's allowed to run simultaneously	Rationale
Desktop, capable GPU	1 canvas (section-scenery) + CSS glow blobs + Framer entrance/scroll animations + hover micro-interactions. living-river instead of (never with) section-scenery — already enforced by conflicts.	This is close to what ships today. Confirmed via probe: 1 canvas at default.
Tablet	Same as desktop; drop card-tilt (already gated pointer: fine, correctly excludes touch).	No change needed — the fine-pointer gate already does this work.
Mobile	section-scenery canvas or a materially simplified version, CSS glow, Framer entrance animations, no hover-only effects (already true — hover states don't fire on touch). No living-river on mobile regardless of admin setting — its own note in site-layers.ts already says it "drops its own resolution on slower machines," but a phone GPU raymarching a fullscreen shader is a real battery/thermal cost with no capacity headroom to fall back into.	Confirmed live: mobile mounted the same 1 canvas as desktop. The engine's DPR/quality scaling (engine/loop.ts) helps, but a design-level budget decision (not just a performance fallback) is missing — see §7.
Low-power devices	section-scenery should drop to its lowest quality tier automatically (the engine already supports "quality only falls, never climbs back" — good instinct, just needs a prefers-reduced-data / rough device-memory heuristic to start lower rather than always starting at full quality and stepping down after the fact).	engine/loop.ts's documented behavior.
Reduced motion	Everything canvas/WebGL-driven renders nothing (SectionScenery returns null, living-river's README states it "drops the scene outright rather than freezing it" — correct philosophy, consistently applied). CSS entrance/hover transitions collapse via the blanket globals.css rule. circuit-road is the one exception with an incomplete gate (§2).	Strong site-wide policy already in place; one bug to close.
What's allowed to run at once, stated plainly: exactly one full-viewport decorative motion system, ever — the codebase already enforces this architecturally (the conflicts graph, the "one shared rAF loop" rule in section-scenery's README, the z-index shelf). That's the right budget. The gap is circuit-road sitting slightly outside that discipline and BombIntro adding an additional, uncoordinated motion event on top of whatever backdrop is running.

6. User Experience
Improves storytelling: yes, genuinely — the tone/scenery pairing gives each section a distinct emotional register (calm dawn → growing field → connected network → arrival → weathering rain → quiet firefly close) that a static page wouldn't have. This is real narrative craft.
Improves navigation: yes — active-nav pill, hide-on-scroll header, tone-as-wayfinding all reinforce "where am I."
Communicates hierarchy: mostly yes, undercut by 1a (empty project cards flatten the one section that should carry the most visual weight) and 1b (header bleed-through).
Creates delight: the glow-disc callback (hero→contact) and the paddy field are the clearest delight moments I found. living-river, if surfaced, would likely be the actual delight peak of the site.
Creates distraction: BombIntro is the clearest offender — a tonal mismatch plus a mandatory delay in front of content, on a first-time basis per section.
Delays content: BombIntro, concretely (~1–2.3s per section, first-view only).
Interferes with accessibility: no major violations found — reduced-motion is handled thoughtfully almost everywhere (the one gap is circuit-road's board-build, and it's off by default so low-impact today); focus states, aria-hidden on decoration, keyboard reachability of the hover-reveal are all handled correctly.
Professional vs. unprofessional: the engineering reads extremely professional (the design docs alone — reasoning about oklab interpolation edge cases, Catmull-Rom segment-width math, resize-vs-scroll velocity bugs — are senior-level craft). The parts that read less professional are content-state issues, not motion issues: empty project cards, the earlier-flagged casual Experience copy. BombIntro is the one place where the motion itself, not the content, undercuts the professional read.
7. Mobile Experience — a deliberate strategy, not "desktop minus effects"
Rather than disabling desktop effects for mobile, the recommended shape:

Scenery stays, simplified rather than removed. Mobile screens are smaller and closer to the eye — motion reads as more prominent per pixel, not less. Rather than pointer-driven interactivity (which doesn't exist on touch anyway), give mobile a slower, lower-density, ambient-only version of each scene (fewer stalks/nodes/particles, same silhouette) — this is a design decision the engine's existing quality-scaling infrastructure could carry without new architecture.
BombIntro should not play at all on mobile, or should be one-shot for the whole page rather than per-section — on a phone, scrolling through six sections and re-triggering a 1–2s animation six times is a materially worse experience than the same thing on a desktop's wider, faster scroll.
living-river and circuit-road off on mobile unconditionally, independent of the admin toggle — a phone has no GPU headroom to spare on a full-viewport shader, and the admin control surface currently has no device-awareness at all (it's a single Firestore boolean serving every visitor).
Touch-specific presence handling already exists and is correct — section-scenery's input.ts decaying presence + noise-wander fallback for "no pointer" is exactly the right call for touch; nothing to change there.
Card-tilt correctly absent on touch via the pointer: fine media query — confirmed correct, no action needed.
8. Performance
Unnecessary render loops: none found running concurrently at default state — confirmed via probe (1 canvas). The conflicts system is doing real architectural work here.
Expensive effects: living-river's fullscreen ray-march is the one genuinely GPU-heavy effect in the codebase, and it is correctly gated (off by default, powerPreference: "low-power", resolution scaling documented in its own README). No action needed beyond the exposure question in §4.
Code-splitting opportunities: living-river, circuit-road, and the 29-file surprise catalog are all good candidates for dynamic import() behind their respective toggles/random-roll, if not already done — worth a quick check of whether layout.tsx's static imports of CircuitRoad/LivingRiverBackdrop are tree-shaken/code-split or bundled into the main chunk regardless of whether the layer is on. Given both are behind server-resolved booleans (not client-side conditionals), Next.js should already exclude the unused branch from the client bundle in most cases — worth confirming with a bundle-analyzer pass rather than assuming.
GPU-heavy effects: living-river (addressed). circuit-road is SVG, CPU/layout-cost more than GPU-cost — its risk is DOM/paint size on a full-document-height SVG with vias/traces/chips, not shader cost.
Effects that should pause when offscreen: living-river's clock already pauses on document.hidden — good. Worth confirming section-scenery's loop does the same (its own README says "pauses entirely while the document is hidden" is a living-river clock behavior specifically — worth double-checking section-scenery/engine/loop.ts has the identical guard, since the two are documented as deliberately not sharing code).
Downgrade on mobile/low-power: the quality-only-falls DPR scaling exists for section-scenery and living-river independently — good pattern, consistently applied twice rather than shared, which the docs explain was a deliberate choice (avoid coupling two independent loops), a reasonable trade of duplication for isolation.
My live fps sample (2s idle rAF count, hero + scenery + glow, no interaction) came back at ~12.8fps in headless Chromium — I'm flagging this as a signal, not a verified fact: headless/automated browser contexts often throttle requestAnimationFrame independent of real rendering performance, so this number should not be taken as ground truth. It's a strong enough signal to warrant a real Chrome DevTools Performance recording or Lighthouse pass on the actual dev machine before trusting either the "it's fine" or "it's slow" read.
9. Final Creative Direction
Visual personality: quietly confident, warm, narrative — a portfolio that trusts restraint (one tone system, one scenery engine, a repeated sun/moon motif) over spectacle. This is already true and should be protected.

Motion personality: should read as "the page is a place with weather in it" — every current animation choice (wind gusts, parting stalks, rain leaning, fireflies rising) is reaching for that same idea. Keep pushing that metaphor; it's the closest thing the site has to a genuine point of view.

3D/depth personality: restrained everywhere except one deliberate deep breath — living-river should be that breath, not a buried admin flag.

Signature experience: promote living-river from hidden toggle to the thing this portfolio is actually known for. Second choice, if that's not wanted: lean harder into section-scenery's "six verbs, one language" idea and make it more overtly showcased (e.g., a brief on-scroll callout, or documenting it as a deliberate feature on the About/skills section itself — "even the background is handwritten canvas, no dependencies").

Supporting experience: section-tone cross-fade, ScrollVeil, the work section's one-shot arrival, hover-reveal on cards (once §1a is fixed).

What should be removed or reduced:

BombIntro — tonal mismatch, content-delaying, doesn't fit the "weather, not cartoons" personality. Retire or demote to opt-in.
circuit-road — redundant with section-scenery, weakest of the four depth systems, incomplete reduced-motion gate, unregistered z-index. Candidate for deletion, not just "keep off by default."
The 29-effect surprise catalog is fine to keep but shouldn't consume more engineering attention than the signature experience does — it's a nice-to-have, not the identity.
What should be preserved: the tone system, section-scenery's engine discipline (noise not sines, approach() not *0.1, one loop), living-river's actual renderer, the reduced-motion philosophy ("disable outright, don't slow down"), card-tilt, hover-reveal.

What should be upgraded: project card imagery (P0, tooling already built), header opacity (P2), living-river's visibility in the actual visitor experience (P1 — a positioning decision more than an engineering one), circuit-road's z-index/reduced-motion gaps if it's kept at all.

10. Implementation Roadmap
P0 — must fix

Wire repo-imagery to the demo/seed projects so featuredImage is populated and the Work section stops showing empty placeholder boxes. Why: this is the highest-visibility failure on the page, on the section that matters most, and the fix is already built — this is finishing existing work, not new scope. Files: src/features/repo-imagery/, project seed data, project-card.tsx.
P1 — high impact
2. Decide BombIntro's fate — remove it or demote it to opt-in/surprise-catalog territory. Why: it's the one animation actively working against the site's own established tone, and it delays real content on every section's first view.
3. Make a deliberate call on living-river's exposure — either default it on for at least the hero, or give it a visible, discoverable visitor-facing entry point instead of an admin-only Firestore flag. Why: it's the most impressive work in the repository and currently invisible to every real visitor.
4. Give circuit-road a real decision: fix or delete. If kept: add it to the conflicts graph explicitly, move its z-index into the LAYER shelf, gate its board-build (not just the ball) behind useMotionPreference(). If not kept: delete it, since it's already off by default and redundant with scenery. Why: it's currently in an unmaintained middle state — present in the codebase and the admin panel, but structurally inconsistent with the discipline the rest of the layer system holds itself to.
5. Mobile motion strategy — explicitly force living-river/circuit-road off on mobile regardless of admin state, and reduce BombIntro to at most once per page load rather than once per section. Why: per §7, mobile currently gets a scaled-down version of the desktop experience rather than a deliberately designed one.

P2 — refinement
6. Header opacity bump (bg-surface/80 → /92+). Why: confirmed live — body copy visibly ghosts through the sticky header.
7. Card-tilt's data-card-tilt stamp moved from next-rAF to synchronous on pointerenter. Why: closes a one-frame transform-ownership race, currently only a theoretical smear on fast hardware.
8. Unify Tailwind-default-eased hover transitions (button.tsx, project-card.tsx, nav links, mobile-menu trigger) onto the shared EASE_OUT curve already used everywhere else. Why: Step 1 finding, still valid — one "personality" claim, five actual curves.
9. Delete or archive the now-fully-superseded river-scenery folder (its import/fallback branch was already removed from layout.tsx this session). Why: avoid a dead, undocumented "is this still live?" question for the next person touching this code.

P3 — optional experimentation
10. Run a real (non-headless-automated) performance profile of section-scenery + glow together — my Playwright fps sample was too unreliable to act on directly but was low enough to be worth a genuine DevTools pass.
11. Consider whether the 29-effect surprise catalog should be curated down rather than grown further — not urgent, but worth a maintenance-cost conversation given it's already larger than the site's actual signature-motion surface area.
12. Explore a light, deliberate on-scroll "how this is built" callout tied to section-scenery, leaning into the "no dependencies, hand-rolled" story as part of the site's own pitch — speaks directly to the target audience (people hiring a senior developer) without adding new animation systems.

No code has been modified, no packages installed beyond the already-present Playwright, and no admin toggles were changed during this audit.