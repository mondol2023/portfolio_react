/**
 * The single shape every Server Action returns.
 *
 * Actions never throw across the network boundary: a thrown error in production
 * reaches the client as an opaque digest, which is useless in a form. Instead
 * failures come back as data the UI can render — a message for the user and,
 * where validation failed, the per-field errors to feed back into the form.
 */

export interface ActionSuccess<T> {
  status: "success";
  data: T;
}

export interface ActionFailure {
  status: "error";
  message: string;
  /** Keyed by field name, matching the Zod schema. */
  fieldErrors?: Record<string, string[]>;
}

export type ActionResult<T = undefined> = ActionSuccess<T> | ActionFailure;

export function actionSuccess(): ActionResult;
export function actionSuccess<T>(data: T): ActionResult<T>;
export function actionSuccess<T>(data?: T): ActionResult<T | undefined> {
  return { status: "success", data };
}

export function actionError(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionFailure {
  return { status: "error", message, ...(fieldErrors ? { fieldErrors } : {}) };
}

/** True when the result carries field-level validation errors. */
export function isActionFailure<T>(result: ActionResult<T>): result is ActionFailure {
  return result.status === "error";
}
