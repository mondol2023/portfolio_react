"use server";

import { withAdmin } from "./admin-guard";
import { actionError, actionSuccess, type ActionResult } from "./action-result";
import { revalidateScenery } from "./revalidation";
import { isSiteLayerId } from "@/components/surprise/site-layers";
import { setSiteLayerEnabled } from "@/lib/firebase/repositories/scenery-repository";

/**
 * Switching one of the site's backdrop layers on or off.
 *
 * A Server Action is a public endpoint, so the id is checked against the
 * registry here rather than trusted — the same reason `setAnimationEnabledAction`
 * does it. Without the guard an arbitrary string would become a field name in
 * `content/scenery`, and nothing downstream would ever read it back out or
 * clean it up.
 *
 * `enabled` is coerced rather than believed for the same reason: the arguments
 * arrive over the wire from a client that may have been tampered with.
 */

const MISSING = "That layer is no longer part of the site.";

export async function setSiteLayerEnabledAction(
  id: string,
  enabled: boolean,
): Promise<ActionResult> {
  return withAdmin(async () => {
    if (!isSiteLayerId(id)) return actionError(MISSING);

    await setSiteLayerEnabled(id, enabled === true);
    revalidateScenery();

    return actionSuccess();
  });
}
