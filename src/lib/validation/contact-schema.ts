import { z } from "zod";

import { requiredText } from "./common";

export const contactSchema = z.object({
  name: requiredText("Name", 2, 80),
  email: z.email("Enter a valid email address."),
  subject: requiredText("Subject", 3, 120),
  message: requiredText("Message", 20, 4000),
  /**
   * Honeypot. Real people never see this field, so anything in it is a bot.
   * Kept in the schema rather than the component so the Server Action can check
   * it without trusting the client to have done so.
   */
  website: z.string().max(0).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

export const contactDefaults: ContactInput = {
  name: "",
  email: "",
  subject: "",
  message: "",
  website: "",
};
