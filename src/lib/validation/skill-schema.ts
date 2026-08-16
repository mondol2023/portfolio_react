import { z } from "zod";

import { PROFICIENCY_LEVELS, SKILL_CATEGORIES } from "@/lib/types/content";

import { optionalText, optionalUrl, orderIndex, requiredText } from "./common";

export const skillSchema = z.object({
  name: requiredText("Name", 1, 60),
  category: z.enum(SKILL_CATEGORIES),
  iconUrl: optionalUrl,
  proficiency: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(PROFICIENCY_LEVELS).optional(),
  ),
  description: optionalText(240),
  order: orderIndex,
  enabled: z.boolean(),
});

export type SkillInput = z.infer<typeof skillSchema>;

export const skillDefaults: SkillInput = {
  name: "",
  category: "languages",
  iconUrl: undefined,
  proficiency: undefined,
  description: undefined,
  order: 0,
  enabled: true,
};
