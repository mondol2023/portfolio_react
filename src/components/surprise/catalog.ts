import type { SurpriseChannel, SurpriseEffect } from "./effect";
import { SURPRISE_EFFECTS } from "./effects";

/**
 * The registry, described rather than run.
 *
 * The admin dashboard needs to list every animation the site can wear, and a
 * list is metadata: names, one-line descriptions, which lane each one occupies.
 * That read happens on the server, so it cannot reach into the effect modules'
 * behaviour — but it does not need to. Everything here is *derived* from
 * `SURPRISE_EFFECTS`, which means there is no second list to keep in step: add
 * an effect to the registry and it appears in the dashboard, remove it and the
 * row goes away.
 *
 * The display name is derived from the id rather than stored, for the same
 * reason. An effect's `label` is written for the reader of the site — "A grid
 * ran off to the horizon" — which is the right thing under the surprise chip
 * and the wrong thing in a settings row, where you want "Grid warp" and the
 * sentence underneath.
 */

export interface AnimationMeta {
  /** Matches the effect's `id`, and is what gets stored in Firestore. */
  id: string;
  /** Settings-row name, e.g. "Grid warp". */
  name: string;
  /** The effect's own reader-facing label, used here as the row's description. */
  description: string;
  channel: SurpriseChannel;
  /** Movement rather than styling — dropped under `prefers-reduced-motion`. */
  animated: boolean;
}

/** Section headings for the dashboard, and the order the sections appear in. */
export const CHANNEL_LABELS: Record<SurpriseChannel, string> = {
  palette: "Colour",
  type: "Typeface",
  ink: "Lettering",
  scale: "Type size",
  backdrop: "Backdrops",
  weather: "Weather",
  overlay: "Overlays",
  chrome: "Edges & shadows",
  flow: "Movement",
  cursor: "Follows the pointer",
};

const CHANNEL_ORDER = Object.keys(CHANNEL_LABELS) as SurpriseChannel[];

/** "grid-warp" → "Grid warp". */
function nameFromId(id: string): string {
  const words = id.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function describe(effect: SurpriseEffect): AnimationMeta {
  return {
    id: effect.id,
    name: nameFromId(effect.id),
    description: effect.label,
    channel: effect.channel,
    animated: effect.animated === true,
  };
}

export const ANIMATION_CATALOG: readonly AnimationMeta[] = SURPRISE_EFFECTS.map(describe);

export interface AnimationGroup {
  channel: SurpriseChannel;
  label: string;
  items: readonly AnimationMeta[];
}

/**
 * The catalog split into its lanes.
 *
 * Grouped by channel because the channel is the one thing about an animation a
 * person choosing between them actually needs to know: two entries in the same
 * group fight over the same pixels, so turning the second one on is a decision
 * to replace the first rather than to add to it.
 */
export const ANIMATION_GROUPS: readonly AnimationGroup[] = CHANNEL_ORDER.map((channel) => ({
  channel,
  label: CHANNEL_LABELS[channel],
  items: ANIMATION_CATALOG.filter((entry) => entry.channel === channel),
})).filter((group) => group.items.length > 0);

/** Guards the id coming in from a Server Action — it arrives as an arbitrary string. */
export function isAnimationId(id: string): boolean {
  return ANIMATION_CATALOG.some((entry) => entry.id === id);
}

/**
 * Ids to effects, in registry order.
 *
 * Unknown ids are dropped rather than throwing: a stored id outlives the effect
 * it names if one is ever removed from the registry, and a stale row in
 * Firestore should cost that animation, not the page.
 */
export function resolveAnimations(ids: readonly string[]): SurpriseEffect[] {
  const wanted = new Set(ids);
  return SURPRISE_EFFECTS.filter((effect) => wanted.has(effect.id));
}
