/**
 * Which slab the reader is attending to — the one rule all four Projects
 * variants resolve it by (Phase L Part 6).
 *
 * Projects has two possible sources of hover and they disagree. The DOM cards
 * sit in the content column; the slabs sit in the page gutters, behind a
 * canvas that is `pointer-events-none` and cannot raycast for itself. Before
 * this, every variant answered from its own screen-space pick alone, so
 * hovering a card lit nothing and the deck lit up only once the cursor had
 * left the content — two layers sharing a scroll position and nothing else.
 *
 * The rule: **a hovered card is the authority.** When one is published, the
 * ray is not consulted at all — not even when the card has no slab, which
 * happens because the page lists five projects and a tier draws two to four
 * of them (`WALL_LIMIT`). Returning `-1` there is the honest answer: the
 * reader is looking at a project the deck is not showing, and lighting
 * whatever the cursor happens to be near instead would be a coincidence
 * dressed up as a response. `pick` is a callback rather than a value so the
 * raycast is skipped entirely on the frames the DOM has already answered.
 */

import { useSceneInteractionStore } from "@/lib/store/scene-interaction-store";

import type { WallSlab } from "./layout";

export function hoveredSlabIndex(slabs: readonly WallSlab[], pick: () => number): number {
  const id = useSceneInteractionStore.getState().hoveredProjectId;
  if (id === null) return pick();
  return slabs.findIndex((slab) => slab.project.id === id);
}
