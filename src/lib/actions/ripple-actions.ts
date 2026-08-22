"use server";

import { withAdmin } from "./admin-guard";
import { actionSuccess, type ActionResult } from "./action-result";
import { revalidateRipple } from "./revalidation";
import { setRippleEnabled } from "@/lib/firebase/repositories/ripple-repository";

/** Turning the water-droplet click ripple on or off for every visitor. */
export async function setRippleEnabledAction(enabled: boolean): Promise<ActionResult> {
  return withAdmin(async () => {
    await setRippleEnabled(enabled);
    revalidateRipple();

    return actionSuccess();
  });
}
