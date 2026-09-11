/**
 * The animations that are components, not effects.
 *
 * `SURPRISE_EFFECTS` covers everything that can be expressed as "mutate the
 * document, hand back an undo". Four things on this site cannot be: they are
 * React components with their own canvases, their own rAF loops and their own
 * lifecycles, mounted by the public shell. The surprise button must never roll
 * one at random — a full-viewport WebGL scene arriving unannounced is not a
 * surprise, it is a fault — but the dashboard should still be able to switch
 * each one on and off, which is what this registry is for.
 *
 * Metadata only. Importing a component here would drag three canvas engines
 * into the admin bundle to render a list of names, and the dashboard is a
 * Server Component that only needs the names.
 *
 * The difference that matters against the effect registry: **these default to
 * on.** An effect is off until someone pins it, so absence from the stored list
 * means off. A layer is part of how the site looks, so absence from the store
 * has to mean *on* — which is why each one names its own Firestore field and is
 * read as a tri-state rather than by membership of an array.
 */

export type SiteLayerId = "section-scenery" | "ambient-glow" | "living-river";

/**
 * Which shelf a layer draws on, and therefore what it can share the page with.
 *
 * Not `SurpriseChannel`: these sit below every effect (`.ambient` is -10,
 * `LAYER.backdrop` is -8) and the question a person asks about them is not
 * "which lane" but "does turning this on take something else down".
 */
export type SiteLayerShelf = "scene" | "wash";

export interface SiteLayer {
  id: SiteLayerId;
  /** Settings-row name. */
  name: string;
  /** The sentence under the switch. */
  description: string;
  shelf: SiteLayerShelf;
  /** On unless the dashboard has explicitly turned it off. */
  defaultOn: boolean;
  /** Movement rather than styling — dropped under `prefers-reduced-motion`. */
  animated: boolean;
  /**
   * Ids that cannot be on at the same time as this one, in either direction.
   * Everything not named here composites freely.
   */
  conflicts?: readonly SiteLayerId[];
  /**
   * The field this layer occupies in `content/scenery`.
   *
   * Spelled out rather than derived from the id because `living-river` was
   * stored as `livingRiver` before this registry existed, and a derived name
   * would silently orphan whatever is already in that document.
   */
  field: string;
  /** Extra warning under the row, for the ones that cost something. */
  note?: string;
}

export const SITE_LAYERS: readonly SiteLayer[] = [
  {
    id: "section-scenery",
    name: "Section scenery",
    description:
      "A canvas behind every section, drawing a different animation for each one — swells under the hero, a field for about, a network for the stack, rails for work, threads for experience, fireflies for contact. It answers the pointer with a different gesture in each.",
    shelf: "scene",
    // Off by default now that `living-river` is: the two conflict, and the
    // signature scene is meant to win the tie on a fresh install. It is still
    // what every visitor `living-river` cannot be shown to actually gets —
    // that fallback is decided per-visitor in `SceneryGate`, not by this flag.
    defaultOn: false,
    animated: true,
    field: "sectionScenery",
  },
  {
    id: "ambient-glow",
    name: "Ambient glow",
    description:
      "The three drifting colour fields, plus light shafts in the day theme and a slow star field at night. This is what carries the section tint, so turning it off leaves the page on its flat background colour.",
    shelf: "wash",
    defaultOn: true,
    animated: true,
    field: "ambientGlow",
  },
  {
    id: "living-river",
    name: "Living river (3D)",
    description:
      "Ray-marched water, a real day cycle, boats that ride the swell, birds that scatter from the cursor.",
    shelf: "scene",
    // The site's signature scene — on unless the admin has turned it off.
    // Still only ever reaches a visitor `SceneryGate` finds eligible for it
    // (desktop, a fine pointer, a real WebGL2 context, not reduced motion,
    // not a low-memory device); everyone else gets `section-scenery` instead,
    // regardless of this flag.
    defaultOn: true,
    animated: true,
    field: "livingRiver",
    // It fills the viewport opaquely, so the section canvas behind it would be
    // paid for and never seen. The painted river (`river-path`, an effect
    // rather than a layer) is excluded in the public shell for the same reason.
    conflicts: ["section-scenery"],
    note: "Heavier than everything else here: it renders on the GPU and drops its own resolution on slower machines rather than dropping frames. It covers the section scenery and the painted river, so those switch off with it.",
  },
];

const BY_ID = new Map(SITE_LAYERS.map((layer) => [layer.id, layer]));

export function isSiteLayerId(id: string): id is SiteLayerId {
  return BY_ID.has(id as SiteLayerId);
}

export function siteLayerField(id: SiteLayerId): string {
  // Non-null: `SiteLayerId` is derived from the same list the map is built from.
  return (BY_ID.get(id) as SiteLayer).field;
}

/** What the site wears when Firestore has never been written to. */
export function defaultSiteLayers(): Record<SiteLayerId, boolean> {
  const state = {} as Record<SiteLayerId, boolean>;
  for (const layer of SITE_LAYERS) state[layer.id] = layer.defaultOn;
  return state;
}

/**
 * The ids that must switch off because `id` just came on.
 *
 * Resolved here rather than in the toggle so the admin's optimistic update and
 * the server's stored state cannot disagree about what a conflict means. The
 * relation is symmetric even when only one side declares it, so a layer never
 * has to remember to name its partner back.
 */
export function conflictsWith(id: SiteLayerId): SiteLayerId[] {
  return SITE_LAYERS.filter(
    (layer) =>
      layer.id !== id &&
      (layer.conflicts?.includes(id) === true || BY_ID.get(id)?.conflicts?.includes(layer.id) === true),
  ).map((layer) => layer.id);
}
