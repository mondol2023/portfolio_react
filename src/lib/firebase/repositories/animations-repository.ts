import "server-only";

import { cache } from "react";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb, requireAdminDb } from "../admin";
import { COLLECTIONS, CONTENT_DOCS } from "../collections";
import { readStringArray } from "../converters";

/**
 * Which animations the site is wearing, as chosen in the dashboard.
 *
 * One document holding one array of effect ids — there is no per-animation
 * record to create or delete, because the animations themselves are code. This
 * only stores which of them are switched on.
 *
 * The read is on the critical path of every public page, so it degrades the
 * same way the rest of the content does: no Firebase, or a failed query, means
 * no pinned animations rather than no page. Nothing here validates the ids
 * against the registry — that is `isAnimationId` at the write end and
 * `resolveAnimations` at the render end, both of which simply ignore an id they
 * do not recognise.
 */

const FIELD = "enabled";

export const getEnabledAnimations = cache(async (): Promise<string[]> => {
  const db = getAdminDb();
  if (!db) return [];

  try {
    const snapshot = await db
      .collection(COLLECTIONS.content)
      .doc(CONTENT_DOCS.animations)
      .get();

    const data = snapshot.data();
    return data ? readStringArray(data, FIELD) : [];
  } catch (error) {
    console.error("[animations] getEnabledAnimations failed", error);
    return [];
  }
});

/**
 * Flips one animation without reading the document first.
 *
 * `arrayUnion` / `arrayRemove` are server-side operations, so two admins on two
 * tabs cannot overwrite each other's toggles the way a read-modify-write of the
 * whole array would.
 */
export async function setAnimationEnabled(id: string, enabled: boolean): Promise<void> {
  await requireAdminDb()
    .collection(COLLECTIONS.content)
    .doc(CONTENT_DOCS.animations)
    .set(
      {
        [FIELD]: enabled ? FieldValue.arrayUnion(id) : FieldValue.arrayRemove(id),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}
