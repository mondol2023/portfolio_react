"use server";

import { withAdmin } from "./admin-guard";
import { actionError, actionSuccess, type ActionResult } from "./action-result";
import { revalidateProjects, revalidateProjectSlugs } from "./revalidation";
import { validate } from "./validate";
import {
  createProject,
  deleteProject,
  getProjectById,
  isSlugTaken,
  reorderProjects,
  setProjectFeatured,
  setProjectPublished,
  updateProject,
} from "@/lib/firebase/repositories/projects-repository";
import { projectSchema, type ProjectInput } from "@/lib/validation/project-schema";
import { reorderSchema, type ReorderInput } from "@/lib/validation/common";

/**
 * Project CRUD.
 *
 * Every export is wrapped in `withAdmin()`, which re-verifies the session cookie
 * on each call. Server Actions are reachable by anyone who can construct the
 * request, so the guarded layout that renders the admin UI grants no authority
 * here — it only decides who gets to see the buttons.
 */

const SLUG_TAKEN = "Another project already uses this slug.";

export async function createProjectAction(
  input: ProjectInput,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin(async () => {
    const parsed = validate(projectSchema, input);
    if (!parsed.ok) return parsed.failure;

    if (await isSlugTaken(parsed.data.slug)) {
      return actionError(SLUG_TAKEN, { slug: [SLUG_TAKEN] });
    }

    const id = await createProject(parsed.data);
    revalidateProjects(parsed.data.slug);

    return actionSuccess({ id });
  });
}

export async function updateProjectAction(
  id: string,
  input: ProjectInput,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin(async () => {
    const parsed = validate(projectSchema, input);
    if (!parsed.ok) return parsed.failure;

    const existing = await getProjectById(id);
    if (!existing) return actionError("That project no longer exists.");

    if (await isSlugTaken(parsed.data.slug, id)) {
      return actionError(SLUG_TAKEN, { slug: [SLUG_TAKEN] });
    }

    await updateProject(id, parsed.data);
    // Both slugs: a rename must also drop the cached page at the old URL.
    revalidateProjectSlugs(existing.slug, parsed.data.slug);

    return actionSuccess({ id });
  });
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  return withAdmin(async () => {
    const existing = await getProjectById(id);
    if (!existing) return actionError("That project no longer exists.");

    await deleteProject(id);
    revalidateProjects(existing.slug);

    return actionSuccess();
  });
}

export async function setProjectPublishedAction(
  id: string,
  published: boolean,
): Promise<ActionResult> {
  return withAdmin(async () => {
    const existing = await getProjectById(id);
    if (!existing) return actionError("That project no longer exists.");

    await setProjectPublished(id, published);
    revalidateProjects(existing.slug);

    return actionSuccess();
  });
}

export async function setProjectFeaturedAction(
  id: string,
  featured: boolean,
): Promise<ActionResult> {
  return withAdmin(async () => {
    const existing = await getProjectById(id);
    if (!existing) return actionError("That project no longer exists.");

    await setProjectFeatured(id, featured);
    revalidateProjects(existing.slug);

    return actionSuccess();
  });
}

export async function reorderProjectsAction(
  items: ReorderInput,
): Promise<ActionResult> {
  return withAdmin(async () => {
    const parsed = validate(reorderSchema, items);
    if (!parsed.ok) return parsed.failure;

    await reorderProjects(parsed.data);
    revalidateProjects();

    return actionSuccess();
  });
}
