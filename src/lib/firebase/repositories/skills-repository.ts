import "server-only";

import { cache } from "react";
import { FieldValue, type DocumentData, type DocumentSnapshot } from "firebase-admin/firestore";

import { DEMO_SKILLS, isDemoContentEnabled } from "@/lib/constants/demo-content";
import { PROFICIENCY_LEVELS, SKILL_CATEGORIES, type Skill } from "@/lib/types/content";
import type { SkillInput } from "@/lib/validation/skill-schema";

import { getAdminDb, requireAdminDb } from "../admin";
import { COLLECTIONS } from "../collections";
import {
  readBoolean,
  readEnum,
  readNumber,
  readOptionalEnum,
  readOptionalString,
  readString,
  stripUndefined,
} from "../converters";

function toSkill(snapshot: DocumentSnapshot): Skill | null {
  const data = snapshot.data();
  if (!data) return null;

  return {
    id: snapshot.id,
    name: readString(data, "name"),
    category: readEnum(data, "category", SKILL_CATEGORIES, "tools"),
    iconUrl: readOptionalString(data, "iconUrl"),
    proficiency: readOptionalEnum(data, "proficiency", PROFICIENCY_LEVELS),
    description: readOptionalString(data, "description"),
    order: readNumber(data, "order"),
    enabled: readBoolean(data, "enabled", true),
  };
}

function byOrderThenName(a: Skill, b: Skill): number {
  if (a.order !== b.order) return a.order - b.order;
  return a.name.localeCompare(b.name);
}

/** Every skill, including disabled ones — admin surfaces only. */
export const getAllSkills = cache(async (): Promise<Skill[]> => {
  const db = getAdminDb();
  if (!db) return [];

  try {
    const snapshot = await db.collection(COLLECTIONS.skills).get();
    return snapshot.docs
      .map(toSkill)
      .filter((skill): skill is Skill => skill !== null)
      .sort(byOrderThenName);
  } catch (error) {
    console.error("[skills] getAllSkills failed", error);
    return [];
  }
});

/**
 * Enabled skills for the public stack section, falling back to `DEMO_SKILLS`
 * while nothing has been added yet. `getAllSkills` above stays free of the
 * fallback so /admin/skills only ever lists editable rows.
 */
export const getEnabledSkills = cache(async (): Promise<Skill[]> => {
  const skills = (await getAllSkills()).filter((skill) => skill.enabled);
  if (skills.length > 0) return skills;
  return isDemoContentEnabled() ? DEMO_SKILLS : [];
});

export const getSkillById = cache(async (id: string): Promise<Skill | null> => {
  const db = getAdminDb();
  if (!db) return null;

  try {
    return toSkill(await db.collection(COLLECTIONS.skills).doc(id).get());
  } catch (error) {
    console.error("[skills] getSkillById failed", error);
    return null;
  }
});

function toDocumentData(input: SkillInput): DocumentData {
  return stripUndefined({ ...input });
}

export async function createSkill(input: SkillInput): Promise<string> {
  const db = requireAdminDb();
  const ref = await db.collection(COLLECTIONS.skills).add({
    ...toDocumentData(input),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateSkill(id: string, input: SkillInput): Promise<void> {
  const db = requireAdminDb();
  const ref = db.collection(COLLECTIONS.skills).doc(id);
  const existing = await ref.get();

  await ref.set({
    ...toDocumentData(input),
    createdAt: existing.get("createdAt") ?? FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteSkill(id: string): Promise<void> {
  await requireAdminDb().collection(COLLECTIONS.skills).doc(id).delete();
}

export async function setSkillEnabled(id: string, enabled: boolean): Promise<void> {
  await requireAdminDb()
    .collection(COLLECTIONS.skills)
    .doc(id)
    .update({ enabled, updatedAt: FieldValue.serverTimestamp() });
}

export async function reorderSkills(
  items: { id: string; order: number }[],
): Promise<void> {
  const db = requireAdminDb();
  const batch = db.batch();
  for (const item of items) {
    batch.update(db.collection(COLLECTIONS.skills).doc(item.id), {
      order: item.order,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
}
