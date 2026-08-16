"use server";

import { withAdmin } from "./admin-guard";
import { actionError, actionSuccess, type ActionResult } from "./action-result";
import { revalidateSkills } from "./revalidation";
import { validate } from "./validate";
import {
  createSkill,
  deleteSkill,
  getSkillById,
  reorderSkills,
  setSkillEnabled,
  updateSkill,
} from "@/lib/firebase/repositories/skills-repository";
import { skillSchema, type SkillInput } from "@/lib/validation/skill-schema";
import { reorderSchema, type ReorderInput } from "@/lib/validation/common";

/** Tech-stack CRUD. Authorization is re-checked inside every call. */

const MISSING = "That technology no longer exists.";

export async function createSkillAction(
  input: SkillInput,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin(async () => {
    const parsed = validate(skillSchema, input);
    if (!parsed.ok) return parsed.failure;

    const id = await createSkill(parsed.data);
    revalidateSkills();

    return actionSuccess({ id });
  });
}

export async function updateSkillAction(
  id: string,
  input: SkillInput,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin(async () => {
    const parsed = validate(skillSchema, input);
    if (!parsed.ok) return parsed.failure;

    if (!(await getSkillById(id))) return actionError(MISSING);

    await updateSkill(id, parsed.data);
    revalidateSkills();

    return actionSuccess({ id });
  });
}

export async function deleteSkillAction(id: string): Promise<ActionResult> {
  return withAdmin(async () => {
    if (!(await getSkillById(id))) return actionError(MISSING);

    await deleteSkill(id);
    revalidateSkills();

    return actionSuccess();
  });
}

export async function setSkillEnabledAction(
  id: string,
  enabled: boolean,
): Promise<ActionResult> {
  return withAdmin(async () => {
    if (!(await getSkillById(id))) return actionError(MISSING);

    await setSkillEnabled(id, enabled);
    revalidateSkills();

    return actionSuccess();
  });
}

export async function reorderSkillsAction(items: ReorderInput): Promise<ActionResult> {
  return withAdmin(async () => {
    const parsed = validate(reorderSchema, items);
    if (!parsed.ok) return parsed.failure;

    await reorderSkills(parsed.data);
    revalidateSkills();

    return actionSuccess();
  });
}
