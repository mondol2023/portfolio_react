"use server";

import { revalidatePath } from "next/cache";

import { withAdmin } from "./admin-guard";
import { actionSuccess, type ActionResult } from "./action-result";
import {
  deleteMessage,
  setMessageRead,
} from "@/lib/firebase/repositories/messages-repository";

/**
 * Contact inbox.
 *
 * Messages never appear on the public site, so these actions revalidate only
 * the admin routes — specifically the layout, because the unread badge in the
 * sidebar is rendered there.
 */

function revalidateInbox(): void {
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
}

export async function setMessageReadAction(
  id: string,
  read: boolean,
): Promise<ActionResult> {
  return withAdmin(async () => {
    await setMessageRead(id, read);
    revalidateInbox();
    return actionSuccess();
  });
}

export async function deleteMessageAction(id: string): Promise<ActionResult> {
  return withAdmin(async () => {
    await deleteMessage(id);
    revalidateInbox();
    return actionSuccess();
  });
}
