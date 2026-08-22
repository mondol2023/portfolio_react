import "server-only";

import { cache } from "react";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb, requireAdminDb } from "../admin";
import { COLLECTIONS, CONTENT_DOCS } from "../collections";
import { readBoolean } from "../converters";

/**
 * On/off switch for the water-droplet click ripple, as chosen in the
 * dashboard.
 *
 * A single boolean in its own singleton doc — there is nothing else to store,
 * since every visual parameter of the ripple lives in code. Defaults to `off`
 * until an admin turns it on from the dashboard, so a missing document, or
 * Firebase being unreachable, never silently turns it on for every visitor.
 */

const FIELD = "enabled";

export const getRippleEnabled = cache(async (): Promise<boolean> => {
  const db = getAdminDb();
  if (!db) return false;

  try {
    const snapshot = await db
      .collection(COLLECTIONS.content)
      .doc(CONTENT_DOCS.rippleEffect)
      .get();

    const data = snapshot.data();
    return data ? readBoolean(data, FIELD, false) : false;
  } catch (error) {
    console.error("[ripple] getRippleEnabled failed", error);
    return false;
  }
});

export async function setRippleEnabled(enabled: boolean): Promise<void> {
  await requireAdminDb()
    .collection(COLLECTIONS.content)
    .doc(CONTENT_DOCS.rippleEffect)
    .set(
      {
        [FIELD]: enabled,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}
