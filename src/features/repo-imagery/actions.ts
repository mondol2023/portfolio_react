"use server";

import { actionError, actionSuccess, type ActionResult } from "@/lib/actions/action-result";
import { withAdmin } from "@/lib/actions/admin-guard";

import { RepoLookupError } from "./github";
import { noteStockDownload } from "./stock";
import { suggestImagery } from "./suggest";
import type { RepoImagerySuggestion } from "./types";

/**
 * The feature's two Server Actions.
 *
 * Both are wrapped in `withAdmin`. Suggesting images is a read, but it is a read
 * that makes this server issue outbound requests on a caller's behalf — leaving
 * it open would hand anyone a GitHub and Unsplash proxy running on this site's
 * quota. The guard is not optional just because nothing is written.
 *
 * `RepoLookupError` is turned into its message here rather than thrown: a thrown
 * error crosses the action boundary as an opaque digest, and "no such
 * repository" versus "rate-limited" is exactly the distinction the author needs
 * to see.
 */

export async function suggestRepoImageryAction(
  repoUrl: string,
): Promise<ActionResult<RepoImagerySuggestion>> {
  return withAdmin(async () => {
    try {
      return actionSuccess(await suggestImagery(repoUrl));
    } catch (error) {
      if (error instanceof RepoLookupError) return actionError(error.message);
      throw error;
    }
  });
}

/**
 * Reports an Unsplash photo as used.
 *
 * Called when the author actually applies a stock photo, which is the moment
 * Unsplash's terms ask about — not when the search results appeared. Always
 * succeeds from the caller's point of view; a failed courtesy ping must not
 * stop an image being applied.
 */
export async function noteStockUsageAction(usageUrl: string): Promise<ActionResult> {
  return withAdmin(async () => {
    await noteStockDownload(usageUrl);
    return actionSuccess();
  });
}
