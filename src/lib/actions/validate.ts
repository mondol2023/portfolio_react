import { z, type ZodType } from "zod";

import { actionError, type ActionFailure } from "./action-result";

/**
 * Server-side validation for Server Actions.
 *
 * Every action re-parses its input with the same schema the form used. The
 * client-side validation is a convenience for the person typing; this is the
 * one that counts, because an action is a public endpoint that anyone can call
 * with any payload.
 */

const GENERIC_MESSAGE = "Please correct the highlighted fields.";

type ValidationResult<T> = { ok: true; data: T } | { ok: false; failure: ActionFailure };

export function validate<S extends ZodType>(
  schema: S,
  input: unknown,
  message = GENERIC_MESSAGE,
): ValidationResult<z.infer<S>> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    const { fieldErrors, formErrors } = z.flattenError(parsed.error);
    return {
      ok: false,
      failure: actionError(
        formErrors[0] ?? message,
        fieldErrors as Record<string, string[]>,
      ),
    };
  }

  return { ok: true, data: parsed.data };
}
