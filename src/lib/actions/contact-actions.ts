"use server";

import { headers } from "next/headers";

import { createMessage } from "@/lib/firebase/repositories/messages-repository";
import { contactSchema, type ContactInput } from "@/lib/validation/contact-schema";

import { actionError, actionSuccess, type ActionResult } from "./action-result";
import { validate } from "./validate";

/**
 * Contact form submission.
 *
 * The only write on the site a signed-out visitor can perform, so it is the
 * only one that needs its own defences: schema validation on the server, a
 * honeypot field, and a Firestore rule that allows creating messages but never
 * reading them back.
 */
export async function submitContactMessage(
  input: ContactInput,
): Promise<ActionResult> {
  const result = validate(contactSchema, input);
  if (!result.ok) return result.failure;

  const { website, ...message } = result.data;

  // A filled honeypot is a bot. Report success so it learns nothing, and write
  // nothing to Firestore.
  if (website) return actionSuccess();

  try {
    const headerList = await headers();
    await createMessage(message, {
      userAgent: headerList.get("user-agent") ?? undefined,
    });
    return actionSuccess();
  } catch (error) {
    console.error("[contact] submitContactMessage failed", error);
    return actionError(
      "Your message could not be sent. Please try again, or email me directly.",
    );
  }
}
