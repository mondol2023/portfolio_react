import { z } from "zod";

import {
  isoDate,
  optionalIsoDate,
  optionalText,
  optionalUrl,
  orderIndex,
  requiredText,
  slug,
  stringList,
} from "./common";

export const caseStudySchema = z.object({
  problem: optionalText(4000),
  solution: optionalText(4000),
  approach: optionalText(4000),
  challenges: optionalText(4000),
  results: optionalText(4000),
});

export const projectSchema = z
  .object({
    title: requiredText("Title", 2, 120),
    slug,
    shortDescription: requiredText("Short description", 10, 240),
    fullDescription: requiredText("Full description", 20, 6000),
    type: requiredText("Project type", 2, 60),
    technologies: stringList("technologies", { min: 1, max: 30 }),
    featuredImage: optionalUrl,
    gallery: z.preprocess(
      (value) =>
        Array.isArray(value)
          ? value.filter((item) => typeof item === "string" && item.trim() !== "")
          : value,
      z.array(z.url("Each gallery entry must be a full URL.")).max(12),
    ),
    githubUrl: optionalUrl,
    liveUrl: optionalUrl,
    startDate: isoDate,
    endDate: optionalIsoDate,
    order: orderIndex,
    featured: z.boolean(),
    published: z.boolean(),
    caseStudy: caseStudySchema,
  })
  .refine((value) => !value.endDate || value.endDate >= value.startDate, {
    message: "End date cannot be before the start date.",
    path: ["endDate"],
  });

export type ProjectInput = z.infer<typeof projectSchema>;

export const projectDefaults: ProjectInput = {
  title: "",
  slug: "",
  shortDescription: "",
  fullDescription: "",
  type: "Web App",
  technologies: [],
  featuredImage: undefined,
  gallery: [],
  githubUrl: undefined,
  liveUrl: undefined,
  startDate: "",
  endDate: undefined,
  order: 0,
  featured: false,
  published: false,
  caseStudy: {
    problem: undefined,
    solution: undefined,
    approach: undefined,
    challenges: undefined,
    results: undefined,
  },
};
