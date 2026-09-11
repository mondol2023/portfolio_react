Audit — portfolio_react
I did not modify anything. Below is what I found by reading the actual source, not assumptions from the stack list.

Headline correction to the brief: there is no Three.js, no react-three-fiber, and no GSAP anywhere in package.json or the source tree. Animation runs on two systems instead: motion (Framer Motion's current package name, v13) for DOM/UI transitions, and several hand-rolled Canvas2D/WebGL render loops for the backgrounds. This is a deliberate, well-executed choice, not a gap — but it means "add R3F/GSAP" isn't a drop-in; it'd be a second animation stack next to a very mature bespoke one.

1. Current animation system
Single source of truth for motion feel in variants.ts: one easing curve, three durations, one stagger step, one viewport config. Every component pulls from it rather than inventing timings.
motion-provider.tsx sets reducedMotion="user" globally as a safety net.
use-motion-preference.ts (useSyncExternalStore on prefers-reduced-motion) is threaded through nearly every animated component individually — not just the library-level flag.
Primitives: reveal.tsx (once-only scroll entrance), stagger.tsx, scroll-veil.tsx (symmetric scroll-linked fade via useScroll/useTransform), animated-text.tsx, bomb-intro.tsx (an elaborate one-shot cartoon-bomb explosion that plays the first time a section enters view), circuit-road.tsx (a fully hand-built SVG PCB trace spanning the document, scroll-chased by a glowing ball).
A large "surprise" system (src/components/surprise/) — 30 separate effect modules (cursor-trail, card-tilt, glitch-ink, grid-warp, confetti-rain, etc.) — each a plain DOM-mutating module with start()/stop(), combinable by a random-pick surprise button or pinned individually from the admin dashboard.
Header active-section indicator uses a shared-layout layoutId pill; scroll-direction hide/show is rAF-throttled with hysteresis (use-scroll-direction.ts).
2. Current 3D system
Two genuinely different things get called "3D," neither is a scene-graph engine:

living-river — a real raymarched-in-fragment-shader scene: one full-screen triangle, a WebGL fragment shader doing sky/water/sun/reflection math in linear light with sRGB conversion (water-renderer.ts), plus a separate 2D sprite layer (birds, boats, fireflies, skyline) composited on top. It has an actual day/night cycle and camera. This is the one place actual "3D" work happens.
section-scenery — not 3D, Canvas2D generative scenes per section (a swell for hero, a "constellation" network for stack, "perspective rails" for work, etc.), one shared render loop, cross-fading, pointer-reactive. Depth is illusion (parallax, rails), not geometry.
river-scenery / river-path — an older painted 2D parallax river, now demoted to a toggleable legacy effect, being displaced by section-scenery (see git status: this migration is mid-flight right now).
living-river and section-scenery are mutually exclusive by design (site-layers.ts) and living-river defaults off.
3. UI/UX strengths
The motion vocabulary really is one system — easing/duration/stagger never drift component to component.
Accessibility is taken seriously as a first-class constraint, not an afterthought: mobile-menu.tsx is a textbook accessible dialog (focus trap, aria-expanded/aria-controls, Escape, focus return, scroll lock, all hand-verified in comments).
project-card.tsx uses the stretched-link pattern correctly — one tab stop per card, no nested anchors, tags are plain text.
Adaptive render quality is built into the section-scenery loop (loop.ts): it measures its own frame cost and drops resolution once, monotonically, avoiding the sharpen/soften oscillation a naive version would have.
Route-scoped loading skeletons mirror the real layout (loading.tsx), placed precisely so a case-study 404 isn't masked by a list skeleton.
Feature flags for every heavy layer are admin-controlled via Firestore (scenery-actions.ts, site-layer-toggles.tsx) — heavy visuals can be turned off without a redeploy.
4. UI/UX weaknesses
Motion maximalism: BombIntro + CircuitRoad + section-scenery + card-tilt + cursor-trail + a random surprise-effect combinator, all live in the default shell (layout.tsx) at once. For a portfolio whose job is "convince someone to hire this person," an exploding cartoon bomb on first scroll is a strong, possibly risky, tone choice.
The surprise system allows multiple effects to combine (channel-based conflict rules prevent literal collisions, but 30 effects × combinations is a large untested visual space) — a visitor could land on a combination that was never eyeballed together.
Three overlapping "animated background" systems exist simultaneously in the codebase (living-river, section-scenery, river-scenery) — real migration debt, not just cleanup.
5. Animation problems
The "ease value toward target every frame via rAF" pattern is hand-duplicated per effect (seen identically in card-tilt.ts and circuit-road's ball-chase) rather than factored into one shared chase/spring utility — each has its own independently tuned EASE constant.
Three separate "has this scrolled into view" mechanisms exist in parallel: Reveal's whileInView, ambient-background's own IntersectionObserver (ambient-background.tsx), and BombIntro's own onViewportEnter. Not buggy, but scattered — a fourth section added later could easily get inconsistent entrance behavior depending which primitive wraps it.
CircuitRoad rebuilds its whole board (PRNG-regenerated SVG paths) on a document.body ResizeObserver — async content (images, CMS data) landing after first paint could visibly re-pop the board mid-scroll.
6. 3D problems
If "improve the 3D experience" means camera-navigable geometry, materials, lighting, post-processing — none of that exists. The shader water in living-river is the only real 3D math on the site, and it's a single quad, not a scene.
living-river, the most technically distinctive visual, defaults off and is exclusive with section-scenery rather than layerable — most visitors never see it.
No visible loading state for WebGL context init — worth checking for a flash of empty canvas before the first shader frame on slow GPUs.
7. Performance risks
No next/dynamic usage anywhere in src — confirmed by search. The WebGL shader code, the entire 30-file surprise catalog, and the section-scenery engine all appear to ship in the client bundle regardless of whether any of it is enabled for a given visitor.
Default shell can run several independent rAF loops concurrently (section-scenery's loop, circuit-road's ball, card-tilt per hovered card, motion's own header animation) — each is individually well-optimized but the aggregate cost on a low-end device is unmeasured.
living-river's own comment says it "drops its own resolution on slower machines rather than dropping frames" — that adaptive guard is specific to living-river and section-scenery; circuit-road has no equivalent cost budget.
8. Mobile problems
Card-tilt correctly no-ops on coarse pointers (pointer: fine gate) — worth confirming every pointer-driven surprise effect (cursor-trail, magnetic-cursor, spotlight) does the same; one that doesn't would leave dead listeners on touch.
Multiple full-document canvases/SVGs (section-scenery + circuit-road) on a long single-page layout is real GPU/battery cost on mid-range Android; only section-scenery has an auto-quality safety net.
No viewport-width-based scenery tier found (e.g., disable section-scenery below some width) beyond the reduced-motion and pointer-type checks.
9. Accessibility problems
Mostly strong (see §3), but: BombIntro's content still waits behind a throw+blast timer (0.9–1.3s + 0.7–1s) even for motion-allowed users before revealing real content on first scroll into a section — worth double-checking against any "no unnecessary reading delay" preference.
site-header.tsx hides via y: "-110%" while staying in tab order by design (per its own comment) — a keyboard user tabbing past it gets an off-screen-then-reappearing header; intentional, but worth a gut check.
Not verified: contrast of the randomized "surprise" palette effects (mono-tint, tone-shuffle, glitch-ink) against WCAG AA — a randomized palette wasn't necessarily designed against real text/background pairs.
10. Highest-impact improvements, ranked
Make a deliberate motion-budget decision — pick 2–3 signature moves (section-scenery + card-tilt is a strong, restrained pair) as the permanent voice, and move BombIntro/CircuitRoad/random-combo surprises to opt-in rather than default-mounted on every page load. This is the single biggest lever for "confident portfolio" vs. "demo reel."
Code-split the heavy, conditional systems with next/dynamic — living-river's WebGL modules, the 30-effect surprise catalog, section-scenery — so JS cost tracks what's actually enabled/triggered, not what merely exists in the repo.
Finish the scenery migration — three overlapping background systems (living-river, section-scenery, river-scenery) is active maintenance debt; retire river-scenery once section-scenery is confirmed as its replacement.
Factor out the repeated rAF-chase pattern into one shared utility so all the hand-tuned "ease toward target" loops (card-tilt, circuit-road ball, likely more in effects/) share one implementation and one place to retune feel.
Let the real 3D piece be seen — either make living-river layerable with section-scenery instead of exclusive-or, or default it on for capable devices (WebGL + deviceMemory feature-detect), since it's the one system that actually answers "3D experience."
Add a mobile/low-power scenery tier, mirroring the frame-budget auto-quality system section-scenery already has, extended to circuit-road and gated on viewport width or deviceMemory.
Consolidate the three separate "in view" observers into one shared hook so future sections get provably consistent entrance behavior.
Want me to turn any one of these (especially #1 or #3) into a concrete implementation plan before touching code?