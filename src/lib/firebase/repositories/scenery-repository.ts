import "server-only";

import { cache } from "react";
import { FieldValue } from "firebase-admin/firestore";

import {
  SITE_LAYERS,
  conflictsWith,
  defaultSiteLayers,
  siteLayerField,
  type SiteLayerId,
} from "@/components/surprise/site-layers";

import { getAdminDb, requireAdminDb } from "../admin";
import { COLLECTIONS, CONTENT_DOCS } from "../collections";
import { readBoolean } from "../converters";

/**
 * Which backdrop layers the site is wearing.
 *
 * Kept in its own document rather than folded into `content/animations`
 * because these are not animations in that sense. That document holds an array
 * of ids and absence means off, which is right for effects the surprise button
 * rolls at random. These are the site's own scenery: most of them are on until
 * somebody decides otherwise, so absence has to mean *on*, and an array cannot
 * express that. One field per layer, read as a tri-state — present and false,
 * present and true, or missing and therefore the registry's default.
 *
 * Read on every public page, so it degrades the way the rest of the content
 * does: no Firebase, or a failed query, means the registry defaults rather than
 * no page. That is the important half of the fallback — a database outage
 * should leave the site looking normal, not bare.
 */

export type SiteLayerState = Record<SiteLayerId, boolean>;

export const getSiteLayers = cache(async (): Promise<SiteLayerState> => {
  const state = defaultSiteLayers();

  const db = getAdminDb();
  if (!db) return state;

  try {
    const snapshot = await db.collection(COLLECTIONS.content).doc(CONTENT_DOCS.scenery).get();
    const data = snapshot.data();
    if (!data) return state;

    for (const layer of SITE_LAYERS) {
      state[layer.id] = readBoolean(data, layer.field, layer.defaultOn);
    }
  } catch (error) {
    console.error("[scenery] getSiteLayers failed", error);
    return defaultSiteLayers();
  }

  return applyConflicts(state);
});

/**
 * Enforces the registry's exclusions on the way out.
 *
 * The write below already switches a conflicting layer off, so this normally
 * changes nothing — but a document written before a conflict was declared, or
 * edited in the Firebase console, would otherwise mount two scenes that were
 * never meant to stack. Cheaper to be certain here than to debug it there.
 */
function applyConflicts(state: SiteLayerState): SiteLayerState {
  for (const layer of SITE_LAYERS) {
    if (!state[layer.id]) continue;
    for (const other of conflictsWith(layer.id)) state[other] = false;
  }
  return state;
}

/**
 * Flips one layer, and switches off anything it cannot share the page with.
 *
 * One `set(…, { merge: true })` rather than a read-modify-write, so two admins
 * in two tabs cannot clobber each other's unrelated switches — the same
 * property `arrayUnion` gives the animations document.
 */
export async function setSiteLayerEnabled(id: SiteLayerId, enabled: boolean): Promise<void> {
  const patch: Record<string, unknown> = {
    [siteLayerField(id)]: enabled,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (enabled) {
    for (const other of conflictsWith(id)) patch[siteLayerField(other)] = false;
  }

  await requireAdminDb()
    .collection(COLLECTIONS.content)
    .doc(CONTENT_DOCS.scenery)
    .set(patch, { merge: true });
}
