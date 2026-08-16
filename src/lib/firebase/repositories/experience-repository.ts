import "server-only";

import { cache } from "react";
import { FieldValue, type DocumentData, type DocumentSnapshot } from "firebase-admin/firestore";

import { DEMO_EXPERIENCES, isDemoContentEnabled } from "@/lib/constants/demo-content";
import { EMPLOYMENT_TYPES, type Experience } from "@/lib/types/content";
import type { ExperienceInput } from "@/lib/validation/experience-schema";

import { getAdminDb, requireAdminDb } from "../admin";
import { COLLECTIONS } from "../collections";
import {
  readBoolean,
  readEnum,
  readIsoDate,
  readNumber,
  readOptionalIsoDate,
  readOptionalString,
  readString,
  readStringArray,
  stripUndefined,
} from "../converters";

function toExperience(snapshot: DocumentSnapshot): Experience | null {
  const data = snapshot.data();
  if (!data) return null;

  const isCurrent = readBoolean(data, "isCurrent");
  return {
    id: snapshot.id,
    company: readString(data, "company"),
    position: readString(data, "position"),
    employmentType: readEnum(data, "employmentType", EMPLOYMENT_TYPES, "full-time"),
    location: readString(data, "location"),
    startDate: readIsoDate(data, "startDate"),
    endDate: isCurrent ? undefined : readOptionalIsoDate(data, "endDate"),
    isCurrent,
    description: readString(data, "description"),
    responsibilities: readStringArray(data, "responsibilities"),
    technologies: readStringArray(data, "technologies"),
    companyUrl: readOptionalString(data, "companyUrl"),
    order: readNumber(data, "order"),
  };
}

/** Newest first, with the explicit `order` field winning over the dates. */
function byOrderThenRecency(a: Experience, b: Experience): number {
  if (a.order !== b.order) return a.order - b.order;
  return b.startDate.localeCompare(a.startDate);
}

export const getExperiences = cache(async (): Promise<Experience[]> => {
  const db = getAdminDb();
  if (!db) return [];

  try {
    const snapshot = await db.collection(COLLECTIONS.experience).get();
    return snapshot.docs
      .map(toExperience)
      .filter((item): item is Experience => item !== null)
      .sort(byOrderThenRecency);
  } catch (error) {
    console.error("[experience] getExperiences failed", error);
    return [];
  }
});

/**
 * The timeline as the public site sees it: stored roles, or the demo set while
 * none have been entered. `getExperiences` above stays unfiltered so
 * /admin/experience only ever lists rows that can be edited or deleted.
 */
export const getPublicExperiences = cache(async (): Promise<Experience[]> => {
  const experiences = await getExperiences();
  if (experiences.length > 0) return experiences;
  return isDemoContentEnabled() ? DEMO_EXPERIENCES : [];
});

export const getExperienceById = cache(
  async (id: string): Promise<Experience | null> => {
    const db = getAdminDb();
    if (!db) return null;

    try {
      return toExperience(await db.collection(COLLECTIONS.experience).doc(id).get());
    } catch (error) {
      console.error("[experience] getExperienceById failed", error);
      return null;
    }
  },
);

function toDocumentData(input: ExperienceInput): DocumentData {
  return stripUndefined({
    ...input,
    // Guarding the invariant at the boundary as well as in the schema: a
    // current role never carries an end date.
    endDate: input.isCurrent ? undefined : input.endDate,
  });
}

export async function createExperience(input: ExperienceInput): Promise<string> {
  const db = requireAdminDb();
  const ref = await db.collection(COLLECTIONS.experience).add({
    ...toDocumentData(input),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateExperience(
  id: string,
  input: ExperienceInput,
): Promise<void> {
  const db = requireAdminDb();
  const ref = db.collection(COLLECTIONS.experience).doc(id);
  const existing = await ref.get();

  await ref.set({
    ...toDocumentData(input),
    createdAt: existing.get("createdAt") ?? FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteExperience(id: string): Promise<void> {
  await requireAdminDb().collection(COLLECTIONS.experience).doc(id).delete();
}

export async function reorderExperiences(
  items: { id: string; order: number }[],
): Promise<void> {
  const db = requireAdminDb();
  const batch = db.batch();
  for (const item of items) {
    batch.update(db.collection(COLLECTIONS.experience).doc(item.id), {
      order: item.order,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
}
