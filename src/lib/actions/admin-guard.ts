import "server-only";

import { NotAuthorizedError, requireAdmin, type AdminUser } from "@/lib/firebase/session";

import { actionError, type ActionResult } from "./action-result";

/**
 * Authorization wrapper for every mutating admin Server Action.
 *
 * A Server Action is a public HTTP endpoint. Rendering a page behind a guarded
 * layout does nothing to protect the actions that page imports — anyone who
 * knows the action id can POST to it directly. So authorization is re-checked
 * here, inside the action, on every single call.
 *
 * Deliberately not a `"use server"` module: files with that directive may only
 * export async functions, and this one exports a generic helper other action
 * modules import.
 */

const SESSION_EXPIRED =
  "Your session has expired or is no longer authorized. Sign in again to continue.";

const GENERIC_FAILURE = "Something went wrong while saving. Please try again.";

export async function withAdmin<T>(
  operation: (admin: AdminUser) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    const admin = await requireAdmin();
    return await operation(admin);
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return actionError(SESSION_EXPIRED);
    }

    // Logged server-side with full detail; the client gets a generic message so
    // a Firestore error can never leak schema or credential hints into the UI.
    console.error("[admin] action failed", error);
    return actionError(GENERIC_FAILURE);
  }
}
