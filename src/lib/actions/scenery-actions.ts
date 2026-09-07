"use server";

import { withAdmin } from "./admin-guard";
import { actionSuccess, type ActionResult } from "./action-result";
import { revalidateScenery } from "./revalidation";
import { setLivingRiverEnabled } from "@/lib/firebase/repositories/scenery-repository";

/**
 * Switching the living river on or off.
 *
 * The argument is a boolean rather than an id, so unlike the animation action
 * there is nothing to validate against a registry — the type is the whole
 * contract, and `withAdmin` is what stops a stranger POSTing to it. Coerced
 * anyway, because a Server Action's arguments arrive over the wire and a
 * client that has been tampered with can send whatever it likes.
 */
export async function setLivingRiverEnabledAction(enabled: boolean): Promise<ActionResult> {
  return withAdmin(async () => {
    await setLivingRiverEnabled(enabled === true);
    revalidateScenery();

    return actionSuccess();
  });
}
