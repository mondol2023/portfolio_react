import "server-only";

import { cache } from "react";
import { FieldValue } from "firebase-admin/firestore";

import { DEFAULT_ANIMATION_SETTINGS } from "@/lib/constants/defaults";
import type { AnimationSettings } from "@/lib/types/content";

import { getAdminDb, requireAdminDb } from "../admin";
import { COLLECTIONS, CONTENT_DOCS } from "../collections";
import { readStringArray } from "../converters";

/**
 * The switches behind `/admin/settings`'s "Animations" section — whether the
 * persistent 3D scene, its particle field and its scroll-driven camera are
 * allowed to run at all. A single singleton document, same shape as
 * `site-settings-repository.ts`: the "enabled" array is read back verbatim
 * when the document exists (an admin who has switched everything off gets an
 * empty array, not a silently-restored default), and only missing-document
 * falls back to `DEFAULT_ANIMATION_SETTINGS`.
 */

export const getAnimationSettings = cache(async (): Promise<AnimationSettings> => {
  const db = getAdminDb();
  if (!db) return DEFAULT_ANIMATION_SETTINGS;

  try {
    const snapshot = await db
      .collection(COLLECTIONS.content)
      .doc(CONTENT_DOCS.animationSettings)
      .get();

    const data = snapshot.data();
    if (!data) return DEFAULT_ANIMATION_SETTINGS;

    // `readStringArray` alone can't tell "field absent" from "field explicitly
    // emptied", and those two must resolve differently here.
    return {
      enabled: Array.isArray(data["enabled"])
        ? readStringArray(data, "enabled")
        : DEFAULT_ANIMATION_SETTINGS.enabled,
    };
  } catch (error) {
    console.error("[settings] getAnimationSettings failed", error);
    return DEFAULT_ANIMATION_SETTINGS;
  }
});

/**
 * Flips one animation on or off. Reads the current resolved state first
 * (rather than an atomic `arrayUnion`/`arrayRemove`) so the stored document
 * always holds the *complete* set after a write — an `arrayRemove` against a
 * document that does not exist yet would leave every other animation looking
 * switched off too, since a missing field can no longer be told apart from an
 * intentionally empty one.
 */
export async function setAnimationEnabled(id: string, next: boolean): Promise<void> {
  const current = await getAnimationSettings();
  const enabled = new Set(current.enabled);

  if (next) enabled.add(id);
  else enabled.delete(id);

  await requireAdminDb()
    .collection(COLLECTIONS.content)
    .doc(CONTENT_DOCS.animationSettings)
    .set({
      enabled: Array.from(enabled),
      updatedAt: FieldValue.serverTimestamp(),
    });
}
