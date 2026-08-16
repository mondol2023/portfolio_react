import "server-only";

import { Timestamp, type DocumentData } from "firebase-admin/firestore";

/**
 * Firestore ⇄ domain-model conversion helpers.
 *
 * The rule enforced here: nothing outside `src/lib/firebase/` ever sees a
 * Firestore `Timestamp`, a `DocumentSnapshot`, or a loosely-typed field. These
 * readers are total — a malformed or missing field degrades to a sensible empty
 * value rather than throwing, because one bad document should not take down a
 * whole page.
 */

export function toIsoString(value: unknown): string | undefined {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim() !== "") return value;
  return undefined;
}

export function readString(data: DocumentData, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

/** Same as `readString` but collapses empty strings to `undefined`. */
export function readOptionalString(
  data: DocumentData,
  key: string,
): string | undefined {
  const value = data[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function readNumber(data: DocumentData, key: string, fallback = 0): number {
  const value = data[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function readBoolean(
  data: DocumentData,
  key: string,
  fallback = false,
): boolean {
  const value = data[key];
  return typeof value === "boolean" ? value : fallback;
}

export function readStringArray(data: DocumentData, key: string): string[] {
  const value = data[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item !== "");
}

/** Reads a value constrained to a union of literals, falling back when absent. */
export function readEnum<T extends string>(
  data: DocumentData,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = data[key];
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Optional variant of `readEnum` — returns `undefined` rather than a fallback. */
export function readOptionalEnum<T extends string>(
  data: DocumentData,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const value = data[key];
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

export function readNestedObject(data: DocumentData, key: string): DocumentData {
  const value = data[key];
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as DocumentData)
    : {};
}

export function readObjectArray(data: DocumentData, key: string): DocumentData[] {
  const value = data[key];
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is DocumentData =>
      typeof item === "object" && item !== null && !Array.isArray(item),
  );
}

export function readIsoDate(data: DocumentData, key: string, fallback = ""): string {
  return toIsoString(data[key]) ?? fallback;
}

export function readOptionalIsoDate(
  data: DocumentData,
  key: string,
): string | undefined {
  return toIsoString(data[key]);
}

/**
 * Strips `undefined` entries from a write payload. Firestore is configured with
 * `ignoreUndefinedProperties`, but dropping them here also means an update never
 * accidentally clears a field the form did not touch.
 */
export function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) result[key] = entry;
  }
  return result as T;
}
