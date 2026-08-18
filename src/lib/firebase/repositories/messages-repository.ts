import "server-only";

import { cache } from "react";
import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";

import type { ContactMessage } from "@/lib/types/content";
import type { ContactInput } from "@/lib/validation/contact-schema";

import { getAdminDb, requireAdminDb } from "../admin";
import { COLLECTIONS } from "../collections";
import { readBoolean, readIsoDate, readString } from "../converters";

/**
 * Contact submissions.
 *
 * Writes go through the Admin SDK inside a Server Action, so the browser never
 * touches this collection directly — the security rules deny client writes
 * outright, which keeps the form from becoming an open write endpoint.
 */

function toMessage(snapshot: DocumentSnapshot): ContactMessage | null {
  const data = snapshot.data();
  if (!data) return null;

  return {
    id: snapshot.id,
    name: readString(data, "name"),
    email: readString(data, "email"),
    subject: readString(data, "subject"),
    message: readString(data, "message"),
    createdAt: readIsoDate(data, "createdAt"),
    read: readBoolean(data, "read"),
    visitorId: readString(data, "visitorId"),
  };
}

/** Persists a submission. Returns the new id. */
export async function createMessage(
  input: Omit<ContactInput, "website">,
  meta: { userAgent?: string; visitorId?: string } = {},
): Promise<string> {
  const db = requireAdminDb();
  const ref = await db.collection(COLLECTIONS.messages).add({
    name: input.name,
    email: input.email,
    subject: input.subject,
    message: input.message,
    read: false,
    userAgent: meta.userAgent ?? null,
    // Links the message to a row in the visitor table.
    visitorId: meta.visitorId ?? "",
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export const getMessages = cache(async (limit = 50): Promise<ContactMessage[]> => {
  const db = getAdminDb();
  if (!db) return [];

  try {
    const snapshot = await db
      .collection(COLLECTIONS.messages)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs
      .map(toMessage)
      .filter((message): message is ContactMessage => message !== null);
  } catch (error) {
    console.error("[messages] getMessages failed", error);
    return [];
  }
});

export const getUnreadMessageCount = cache(async (): Promise<number> => {
  const db = getAdminDb();
  if (!db) return 0;

  try {
    // `count()` is an aggregation query — it bills a fraction of a read and
    // never transfers the documents themselves.
    const snapshot = await db
      .collection(COLLECTIONS.messages)
      .where("read", "==", false)
      .count()
      .get();
    return snapshot.data().count;
  } catch (error) {
    console.error("[messages] getUnreadMessageCount failed", error);
    return 0;
  }
});

export async function setMessageRead(id: string, read: boolean): Promise<void> {
  await requireAdminDb().collection(COLLECTIONS.messages).doc(id).update({ read });
}

export async function deleteMessage(id: string): Promise<void> {
  await requireAdminDb().collection(COLLECTIONS.messages).doc(id).delete();
}
