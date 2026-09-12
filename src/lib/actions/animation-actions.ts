"use server";

import { withAdmin } from "./admin-guard";
import { actionSuccess, type ActionResult } from "./action-result";
import { revalidateAnimationSettings } from "./revalidation";
import { setAnimationEnabled } from "@/lib/firebase/repositories/animation-settings-repository";

/**
 * The one animation switch: an id plus the boolean it should now be. No Zod
 * schema — there is no form here, just `AnimationToggles` posting a known id
 * from a list it was handed, so the only real validation is `withAdmin`'s
 * session check, same as every other mutating action.
 */
export async function setAnimationEnabledAction(
  id: string,
  next: boolean,
): Promise<ActionResult> {
  return withAdmin(async () => {
    await setAnimationEnabled(id, next);
    revalidateAnimationSettings();

    return actionSuccess();
  });
}
