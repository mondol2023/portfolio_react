import { z } from "zod";

import { EMPLOYMENT_TYPES } from "@/lib/types/content";

import {
  isoDate,
  optionalIsoDate,
  optionalUrl,
  orderIndex,
  requiredText,
  stringList,
} from "./common";

export const experienceSchema = z
  .object({
    company: requiredText("Company", 2, 120),
    position: requiredText("Position", 2, 120),
    employmentType: z.enum(EMPLOYMENT_TYPES),
    location: requiredText("Location", 2, 120),
    startDate: isoDate,
    endDate: optionalIsoDate,
    isCurrent: z.boolean(),
    description: requiredText("Description", 10, 2000),
    responsibilities: stringList("responsibilities", { max: 12 }),
    technologies: stringList("technologies", { max: 30 }),
    companyUrl: optionalUrl,
    order: orderIndex,
  })
  .refine((value) => value.isCurrent || Boolean(value.endDate), {
    message: "Add an end date, or mark this role as current.",
    path: ["endDate"],
  })
  .refine((value) => !value.endDate || value.endDate >= value.startDate, {
    message: "End date cannot be before the start date.",
    path: ["endDate"],
  })
  // A current role with an end date is contradictory — the timeline would render
  // "Present" next to a finished date.
  .refine((value) => !(value.isCurrent && value.endDate), {
    message: "A current role cannot have an end date.",
    path: ["endDate"],
  });

export type ExperienceInput = z.infer<typeof experienceSchema>;

export const experienceDefaults: ExperienceInput = {
  company: "",
  position: "",
  employmentType: "full-time",
  location: "",
  startDate: "",
  endDate: undefined,
  isCurrent: false,
  description: "",
  responsibilities: [],
  technologies: [],
  companyUrl: undefined,
  order: 0,
};
