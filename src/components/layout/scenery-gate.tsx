"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

import { useLivingRiverEligible } from "@/features/living-river/use-eligible";

import { AmbientBackground } from "./ambient-background";

/**
 * The heavy half of the living river — shaders, two canvases, the whole
 * `core`/`gl`/`sprites` tree — loaded only once `useLivingRiverEligible` has
 * actually said yes. Imported from its own file rather than the feature's
 * barrel (`@/features/living-river`) so this boundary does not depend on the
 * bundler tree-shaking an otherwise-unused re-export out again: a visitor who
 * cannot use it never fetches its chunk.
 */
const LivingRiverBackdrop = dynamic(
  () => import("@/features/living-river/living-river-backdrop").then((m) => m.LivingRiverBackdrop),
  { ssr: false },
);

interface SceneryGateProps {
  /** The drifting colour fields, rays and stars — independent of which scene runs. */
  glow: boolean;
  /** The admin's `section-scenery` switch. */
  sectionScenery: boolean;
  /** The admin's `living-river` switch — permission, not a guarantee. */
  livingRiver: boolean;
}

/**
 * Picks this visitor's one full-viewport backdrop.
 *
 * The admin flags say what the *site* is allowed to show; whether living river
 * is right for *this* visitor — desktop, a fine pointer, a real WebGL2
 * context, not reduced motion, not a low-memory device — is a client-only
 * question, so it has to be answered here rather than baked into the page the
 * server sent. Until it's answered, and whenever the answer is "no",
 * `SectionScenery` is on screen: it is the fallback for every one of those
 * "no"s, not only the admin's own kill switch — which is what keeps a mobile
 * or reduced-motion visitor from ever seeing a gap where a backdrop should be.
 *
 * `section-scenery` and `living-river` are already mutually exclusive at the
 * admin layer (`conflicts` in `site-layers.ts`, enforced in
 * `scenery-repository.ts`), so `sectionScenery` is normally `false` exactly
 * when `livingRiver` is `true`. The `|| (livingRiver && !showLivingRiver)`
 * term below is what re-admits section scenery for the visitors that server
 * truth does not, and cannot, know about.
 */
export function SceneryGate({ glow, sectionScenery, livingRiver }: SceneryGateProps) {
  const eligible = useLivingRiverEligible(livingRiver);
  const [failed, setFailed] = useState(false);
  // Stable identity: `LivingRiverBackdrop`'s effect depends on this, and a new
  // function every render would tear its river down and restart it for no
  // reason whenever something up here causes a re-render.
  const handleUnavailable = useCallback(() => setFailed(true), []);

  const showLivingRiver = livingRiver && eligible && !failed;
  const showSectionScenery = sectionScenery || (livingRiver && !showLivingRiver);

  return (
    <>
      <AmbientBackground glow={glow} scenery={showSectionScenery} />
      {showLivingRiver ? <LivingRiverBackdrop onUnavailable={handleUnavailable} /> : null}
    </>
  );
}
