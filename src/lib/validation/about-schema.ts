import { z } from "zod";

import { optionalText, requiredText } from "./common";

export const aboutStatSchema = z.object({
  label: requiredText("Stat label", 2, 40),
  /** Free text, not a number — "12+", "3 yrs" and "Since 2019" are all valid. */
  value: requiredText("Stat value", 1, 20),
  detail: optionalText(120),
});

export const aboutSchema = z.object({
  introduction: requiredText("Introduction", 20, 1200),
  philosophy: requiredText("Philosophy", 20, 1200),
  summary: requiredText("Summary", 20, 1200),
  stats: z.array(aboutStatSchema).max(4, "Four statistics is the visual limit."),
});

export type AboutInput = z.infer<typeof aboutSchema>;
export type AboutStatInput = z.infer<typeof aboutStatSchema>;
