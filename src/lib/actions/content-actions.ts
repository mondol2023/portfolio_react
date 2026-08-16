"use server";

import { withAdmin } from "./admin-guard";
import { actionSuccess, type ActionResult } from "./action-result";
import { revalidateAbout, revalidateSiteSettings } from "./revalidation";
import { validate } from "./validate";
import { updateAbout } from "@/lib/firebase/repositories/about-repository";
import { updateSiteSettings } from "@/lib/firebase/repositories/site-settings-repository";
import { aboutSchema, type AboutInput } from "@/lib/validation/about-schema";
import {
  siteSettingsSchema,
  type SiteSettingsInput,
} from "@/lib/validation/site-settings-schema";

/**
 * The two singleton documents: About and Site Settings.
 *
 * Grouped in one module because neither has a collection behind it — there is
 * nothing to create, delete or reorder, only a single record to edit.
 */

export async function updateAboutAction(input: AboutInput): Promise<ActionResult> {
  return withAdmin(async () => {
    const parsed = validate(aboutSchema, input);
    if (!parsed.ok) return parsed.failure;

    await updateAbout(parsed.data);
    revalidateAbout();

    return actionSuccess();
  });
}

export async function updateSiteSettingsAction(
  input: SiteSettingsInput,
): Promise<ActionResult> {
  return withAdmin(async () => {
    const parsed = validate(siteSettingsSchema, input);
    if (!parsed.ok) return parsed.failure;

    await updateSiteSettings(parsed.data);
    revalidateSiteSettings();

    return actionSuccess();
  });
}
