"use client";

import { useEffect, useRef, type MutableRefObject } from "react";

import { DEFAULT_IDENTITY, type ProjectIdentity } from "@/lib/constants/project-identity";
import type { SectionTone } from "@/lib/constants/section-tone";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

import { initialQuality, type SceneDensity } from "./engine/density";
import { createSceneLoop, type SceneLoop } from "./engine/loop";
import type { SceneFactory } from "./engine/scene";
import { readTonePalettes, watchTheme, type TonePalettes } from "./engine/tone-color";
import { SCENES } from "./scenes";
import { useSceneryDensity } from "./use-density";

/** The last `(tone, density, identity)` triple built into a `SceneFactory`, so a
 *  re-render that changes none of them hands the loop back the exact same
 *  reference — see `getFactory` below for why that reference has to be stable. */
interface BuiltFactory {
  tone: SectionTone;
  density: SceneDensity;
  identity: ProjectIdentity;
  factory: SceneFactory;
}

/**
 * `SCENES[tone]` wants a density; the render loop wants a zero-arg
 * `SceneFactory` and tells two calls apart by comparing that factory's
 * *reference* (`current?.factory === factory` in `engine/loop.ts`, its guard
 * against rebuilding a section that hasn't actually changed). A new closure
 * on every call would defeat that guard and cross-fade on every retint — so
 * the wrapper is cached in `ref` and only rebuilt when `tone`, `density` or
 * `identity` actually differs from last time.
 *
 * Module-level rather than a closure inside the component: it captures
 * nothing from render scope, so calling it from an effect never needs to
 * list it as a dependency.
 */
function getFactory(
  ref: MutableRefObject<BuiltFactory | null>,
  tone: SectionTone,
  density: SceneDensity,
  identity: ProjectIdentity,
): SceneFactory {
  const built = ref.current;
  if (built && built.tone === tone && built.density === density && built.identity === identity) {
    return built.factory;
  }

  const sceneFactory = SCENES[tone];
  const factory: SceneFactory = () => sceneFactory(density, identity);
  ref.current = { tone, density, identity, factory };
  return factory;
}

/**
 * The canvas layer that gives each section its own scenery.
 *
 * It takes the resolved tone as a prop rather than resolving it itself. The
 * `IntersectionObserver` in `ambient-background.tsx` already answers "which
 * section is the reader looking at", and it answers it carefully — it stores the
 * pathname alongside the tone so a stale route's colour cannot stick. Duplicating
 * that here would mean two observers on the same six elements and two chances to
 * get the route edge case wrong.
 *
 * Nothing is drawn under `prefers-reduced-motion`. The CSS in `globals.css`
 * already stops the ambient blobs, but a `requestAnimationFrame` loop is
 * invisible to a stylesheet, so the gate has to be here.
 *
 * That gate waits for hydration before it opens. `useMotionPreference`
 * reports `false` during the hydration render — its server snapshot has to
 * match the HTML it is hydrating — so gating on it alone still mounted this
 * canvas and took a 2D context for a reduced-motion visitor, for the ~600ms
 * until the correction landed. Nothing was ever painted in that window, but
 * 'renders nothing' should mean no canvas at all, not an unpainted one.
 *
 * `identity` arrives the same way and from the same observer: a project page
 * publishes it on the elements that already carry `data-tone-anchor`, so which
 * project's room this is costs no second observer and no second listener. Off
 * a project page it is simply `base`, which reproduces the site's own numbers.
 */
export function SectionScenery({
  tone,
  identity = DEFAULT_IDENTITY,
}: {
  tone: SectionTone;
  identity?: ProjectIdentity;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loopRef = useRef<SceneLoop | null>(null);
  const palettesRef = useRef<TonePalettes | null>(null);
  const builtRef = useRef<BuiltFactory | null>(null);
  /** The tone the theme watcher should retint to. Kept in a ref so a colour
   *  change never has to re-run the setup effect and rebuild the loop. */
  const toneRef = useRef(tone);
  /** Mirrors `toneRef` for the same reason: the setup effect reads it on mount
   *  and the identity effect keeps it fresh, so neither has to depend on the
   *  other. */
  const identityRef = useRef(identity);
  const reduced = useMotionPreference();
  const hydrated = useHydrated();
  /** `reduced` is only trustworthy once hydrated — until then it is the
   *  server's optimistic guess, so treat unknown as 'do not draw'. */
  const inert = !hydrated || reduced;
  const density = useSceneryDensity();
  /** Mirrors `toneRef`: read by the setup effect on mount, kept fresh by the
   *  density effect afterward, so neither effect needs the other in its
   *  dependency array. */
  const densityRef = useRef(density);

  useEffect(() => {
    if (inert) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const loop = createSceneLoop(canvas, { initialQuality: initialQuality(densityRef.current) });
    // No 2D context to be had. The CSS ambient layer is still there and is a
    // complete backdrop on its own, so this simply does not run.
    if (!loop) return;

    loopRef.current = loop;
    palettesRef.current = readTonePalettes();

    const currentPalette = () => palettesRef.current?.[toneRef.current];

    const palette = currentPalette();
    if (palette) {
      loop.show(
        getFactory(builtRef, toneRef.current, densityRef.current, identityRef.current),
        palette,
      );
    }

    const unwatch = watchTheme(() => {
      // A theme flip changes the values, not the scene. Re-read and retint, so
      // the canvas does not restart mid-gesture just because the lights changed.
      palettesRef.current = readTonePalettes();
      const next = currentPalette();
      if (next) loop.retint(next);
    });

    return () => {
      unwatch();
      loop.stop();
      loopRef.current = null;
      palettesRef.current = null;
    };
  }, [inert]);

  // Declared second, so on mount it runs *after* the loop exists. On the first
  // pass it therefore agrees with the setup effect above and `show` no-ops.
  //
  // Identity rides in the same effect rather than a third one. The two only ever
  // change together — walking into a project page changes both, and a chapter
  // change inside one moves the tone while the identity holds — so one effect is
  // one `show` and one cross-fade, where two would have raced on the route change.
  useEffect(() => {
    toneRef.current = tone;
    identityRef.current = identity;
    const loop = loopRef.current;
    const palette = palettesRef.current?.[tone];
    if (!loop || !palette) return;
    loop.show(getFactory(builtRef, tone, densityRef.current, identity), palette);
  }, [tone, identity]);

  // A viewport/device tier change — crossing a breakpoint, or the one-time
  // hydration correction from the server's optimistic `full` guess (see
  // `use-density.ts`). Rebuilds the current scene at the new density through
  // the loop's existing cross-fade, and only ever lowers the resolution
  // budget (`setQuality`), never restarts the loop itself.
  useEffect(() => {
    densityRef.current = density;
    const loop = loopRef.current;
    const palette = palettesRef.current?.[toneRef.current];
    if (!loop || !palette) return;
    loop.show(getFactory(builtRef, toneRef.current, density, identityRef.current), palette);
    loop.setQuality(initialQuality(density));
  }, [density]);

  if (inert) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      // `inset-0 h-full w-full` rather than a new class in `globals.css`: the
      // canvas is a child of `.ambient`, which is already fixed, full-bleed and
      // non-interactive, so it inherits everything that matters.
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
