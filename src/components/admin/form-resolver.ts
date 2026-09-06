"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";
import type { ZodType } from "zod";

/*
 * Keys that hold something other than a nested error node. `ref` is a live DOM
 * element and `types` is criteria-mode metadata; walking into either is at best
 * wasted work and at worst a cycle.
 */
const NON_ERROR_KEYS = new Set(["ref", "types"]);

/** First `message` anywhere under a node, depth-first. */
function firstMessage(node: unknown): string | undefined {
  if (!node || typeof node !== "object") return undefined;

  const message = (node as { message?: unknown }).message;
  if (typeof message === "string" && message !== "") return message;

  for (const [key, child] of Object.entries(node)) {
    if (NON_ERROR_KEYS.has(key)) continue;
    const found = firstMessage(child);
    if (found) return found;
  }

  return undefined;
}

/**
 * Lifts an error raised on an array *element* onto the array field itself.
 *
 * Zod reports a bad list entry at `responsibilities.0`, which the resolver turns
 * into `errors.responsibilities[0].message` — while every `<Field>` reads
 * `errors.responsibilities?.message`, which is undefined for that shape. The
 * result is a form that refuses to submit while displaying nothing at all: the
 * save button looks broken. Nothing here renders per-index messages, so hoisting
 * the first one to where the field is actually watching costs no information.
 */
function hoistNestedMessages(errors: FieldErrors): void {
  for (const node of Object.values(errors)) {
    if (!node || typeof node !== "object") continue;

    const entry = node as { type?: string; message?: unknown };
    if (typeof entry.message === "string" && entry.message !== "") continue;

    const message = firstMessage(node);
    if (message) {
      entry.message = message;
      entry.type ??= "validation";
    }
  }
}

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
  const resolve = zodResolver(schema as never) as Resolver<TValues>;

  return async (values, context, options) => {
    const result = await resolve(values, context, options);
    // Mutated in place: spreading `result` would collapse RHF's success/error
    // union and lose the correlation between `values` and `errors`.
    hoistNestedMessages(result.errors);
    return result;
  };
}
