import { z } from "zod";

/**
 * Shared field builders.
 *
 * Validation lives here rather than inside components so that the same schema
 * guards the client form (via `zodResolver`) and the Server Action that
 * actually writes — client-side validation is a convenience, the server-side
 * parse is the one that counts.
 */

/** HTML inputs submit "" for untouched optional fields; Firestore wants absence. */
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const requiredText = (label: string, min = 1, max = 2000) =>
  z
    .string()
    .trim()
    .min(min, min === 1 ? `${label} is required.` : `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

export const optionalText = (max = 2000) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

export const optionalUrl = z.preprocess(
  emptyToUndefined,
  z.url("Enter a full URL, including https://").max(500).optional(),
);

export const requiredUrl = z.url("Enter a full URL, including https://").max(500);

export const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD date format.");

export const optionalIsoDate = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD date format.")
    .optional(),
);

export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Slug must be at least 2 characters.")
  .max(80, "Slug must be 80 characters or fewer.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and single hyphens (e.g. my-project).",
  );

export const orderIndex = z.coerce
  .number()
  .int("Order must be a whole number.")
  .min(0, "Order cannot be negative.")
  .max(9999);

/** A tag/technology list. Empty entries are dropped before validation. */
export const stringList = (
  label: string,
  { min = 0, max = 40 }: { min?: number; max?: number } = {},
) =>
  z.preprocess(
    (value) =>
      Array.isArray(value)
        ? value.filter((item) => typeof item === "string" && item.trim() !== "")
        : value,
    z
      .array(z.string().trim().min(1).max(60))
      .min(min, min > 0 ? `Add at least ${min} ${label}.` : undefined)
      .max(max, `No more than ${max} ${label} allowed.`),
  );

/** Reorder payload shared by every sortable collection. */
export const reorderSchema = z
  .array(z.object({ id: z.string().min(1), order: z.number().int().min(0) }))
  .min(1);

export type ReorderInput = z.infer<typeof reorderSchema>;
