import "server-only";

import { cache } from "react";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb, requireAdminDb } from "../admin";
import { COLLECTIONS, CONTENT_DOCS } from "../collections";
import { readBoolean } from "../converters";

/**
 * Which river the site is wearing.
 *
 * Kept in its own document rather than folded into `content/animations`
 * because it is not an animation in that sense: the surprise button rolls
 * animations at random and combines them, and a full-viewport WebGL scene is
 * not something that should ever arrive unannounced on top of another
 * backdrop. It has one switch, in one place, and the site layout reads it to
 * decide which of the two scenes to mount — never both, since they would
 * stack on the same `LAYER.backdrop` shelf.
 *
 * Read on every public page, so it degrades the way the rest of the content
 * does: no Firebase, or a failed query, means the quieter CSS scene rather
 * than no page.
 */

const FIELD = "livingRiver";

/** Off unless someone has turned it on. The CSS scene is the safe default. */
export const getLivingRiverEnabled = cache(async (): Promise<boolean> => {
  const db = getAdminDb();
  if (!db) return false;

  try {
    const snapshot = await db.collection(COLLECTIONS.content).doc(CONTENT_DOCS.scenery).get();

    const data = snapshot.data();
    return data ? readBoolean(data, FIELD, false) : false;
  } catch (error) {
    console.error("[scenery] getLivingRiverEnabled failed", error);
    return false;
  }
});

export async function setLivingRiverEnabled(enabled: boolean): Promise<void> {
  await requireAdminDb()
    .collection(COLLECTIONS.content)
    .doc(CONTENT_DOCS.scenery)
    .set(
      { [FIELD]: enabled, updatedAt: FieldValue.serverTimestamp() },
      // Merged rather than replaced: this document is the natural home for any
      // future scene setting, and a write here must not erase a neighbour.
      { merge: true },
    );
}
