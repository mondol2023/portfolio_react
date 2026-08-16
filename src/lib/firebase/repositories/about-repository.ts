import "server-only";

import { cache } from "react";
import { FieldValue } from "firebase-admin/firestore";

import { DEMO_ABOUT_STATS, isDemoContentEnabled } from "@/lib/constants/demo-content";
import { DEFAULT_ABOUT } from "@/lib/constants/defaults";
import type { About, AboutStat } from "@/lib/types/content";
import type { AboutInput } from "@/lib/validation/about-schema";

import { getAdminDb, requireAdminDb } from "../admin";
import { COLLECTIONS, CONTENT_DOCS } from "../collections";
import {
  readObjectArray,
  readOptionalString,
  readString,
  stripUndefined,
} from "../converters";

/**
 * The About section is a singleton document. Until the owner fills it in from
 * /admin/about it falls back to `DEFAULT_ABOUT`, which is deliberately generic:
 * it makes no claim about years of experience, clients or outcomes.
 */

export const getAbout = cache(async (): Promise<About> => {
  const db = getAdminDb();
  if (!db) return DEFAULT_ABOUT;

  try {
    const snapshot = await db
      .collection(COLLECTIONS.content)
      .doc(CONTENT_DOCS.about)
      .get();

    const data = snapshot.data();
    if (!data) return DEFAULT_ABOUT;

    const stats: AboutStat[] = readObjectArray(data, "stats")
      .map((stat) => ({
        label: readString(stat, "label"),
        value: readString(stat, "value"),
        detail: readOptionalString(stat, "detail"),
      }))
      .filter((stat) => stat.label !== "" && stat.value !== "");

    return {
      introduction: readString(data, "introduction", DEFAULT_ABOUT.introduction),
      philosophy: readString(data, "philosophy", DEFAULT_ABOUT.philosophy),
      summary: readString(data, "summary", DEFAULT_ABOUT.summary),
      stats,
    };
  } catch (error) {
    console.error("[about] getAbout failed", error);
    return DEFAULT_ABOUT;
  }
});

/**
 * About as the public page sees it, with sample statistics standing in while the
 * owner has entered none. The admin form calls `getAbout` instead — prefilling
 * the editor with invented numbers would be how they end up saved as real.
 */
export const getPublicAbout = cache(async (): Promise<About> => {
  const about = await getAbout();
  if (about.stats.length > 0 || !isDemoContentEnabled()) return about;
  return { ...about, stats: DEMO_ABOUT_STATS };
});

export async function updateAbout(input: AboutInput): Promise<void> {
  await requireAdminDb()
    .collection(COLLECTIONS.content)
    .doc(CONTENT_DOCS.about)
    .set({
      introduction: input.introduction,
      philosophy: input.philosophy,
      summary: input.summary,
      stats: input.stats.map((stat) => stripUndefined({ ...stat })),
      updatedAt: FieldValue.serverTimestamp(),
    });
}
