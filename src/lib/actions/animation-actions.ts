"use server";

import { withAdmin } from "./admin-guard";
import { actionError, actionSuccess, type ActionResult } from "./action-result";
import { revalidateAnimations } from "./revalidation";
import { isAnimationId } from "@/components/surprise/catalog";
import { setAnimationEnabled } from "@/lib/firebase/repositories/animations-repository";

/**
 * Turning a site animation on or off.
 *
 * A Server Action is a public endpoint, so the id is checked against the
 * registry here rather than trusted: without that, anything at all could be
 * written into the enabled list, and every public page would carry it around
 * until someone noticed.
 */

const MISSING = "That animation is no longer part of the site.";

export async function setAnimationEnabledAction(
  id: string,
  enabled: boolean,
): Promise<ActionResult> {
  return withAdmin(async () => {
    if (!isAnimationId(id)) return actionError(MISSING);

    await setAnimationEnabled(id, enabled);
    revalidateAnimations();

    return actionSuccess();
  });
}
