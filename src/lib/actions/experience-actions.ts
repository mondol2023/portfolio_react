"use server";

import { withAdmin } from "./admin-guard";
import { actionError, actionSuccess, type ActionResult } from "./action-result";
import { revalidateExperience } from "./revalidation";
import { validate } from "./validate";
import {
  createExperience,
  deleteExperience,
  getExperienceById,
  reorderExperiences,
  updateExperience,
} from "@/lib/firebase/repositories/experience-repository";
import {
  experienceSchema,
  type ExperienceInput,
} from "@/lib/validation/experience-schema";
import { reorderSchema, type ReorderInput } from "@/lib/validation/common";

/** Experience timeline CRUD. Authorization is re-checked inside every call. */

export async function createExperienceAction(
  input: ExperienceInput,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin(async () => {
    const parsed = validate(experienceSchema, input);
    if (!parsed.ok) return parsed.failure;

    const id = await createExperience(parsed.data);
    revalidateExperience();

    return actionSuccess({ id });
  });
}

export async function updateExperienceAction(
  id: string,
  input: ExperienceInput,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin(async () => {
    const parsed = validate(experienceSchema, input);
    if (!parsed.ok) return parsed.failure;

    if (!(await getExperienceById(id))) {
      return actionError("That role no longer exists.");
    }

    await updateExperience(id, parsed.data);
    revalidateExperience();

    return actionSuccess({ id });
  });
}

export async function deleteExperienceAction(id: string): Promise<ActionResult> {
  return withAdmin(async () => {
    if (!(await getExperienceById(id))) {
      return actionError("That role no longer exists.");
    }

    await deleteExperience(id);
    revalidateExperience();

    return actionSuccess();
  });
}

export async function reorderExperiencesAction(
  items: ReorderInput,
): Promise<ActionResult> {
  return withAdmin(async () => {
    const parsed = validate(reorderSchema, items);
    if (!parsed.ok) return parsed.failure;

    await reorderExperiences(parsed.data);
    revalidateExperience();

    return actionSuccess();
  });
}
