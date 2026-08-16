"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver } from "react-hook-form";
import type { ZodType } from "zod";

/**
 * `zodResolver`, typed against the schema's *output*.
 *
 * Several shared field builders use `z.preprocess` and `z.coerce` — an empty
 * text input becomes `undefined`, a numeric string becomes a number — so a
 * schema's input type is not its output type. The resolver is declared over the
 * input side, while every admin form is written against the output side, which
 * is also what the Server Action receives.
 *
 * The two shapes are structurally identical for our schemas; only the
 * *declared* types differ. Asserting that once here is honest and contained,
 * and beats repeating the same assertion in six form components.
 */
export function formResolver<TValues extends FieldValues>(
  schema: ZodType<TValues>,
): Resolver<TValues> {
  return zodResolver(schema as never) as Resolver<TValues>;
}
