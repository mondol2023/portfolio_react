import { z } from "zod";

import { AVAILABILITY_STATUSES } from "@/lib/types/content";

import { optionalPhone, optionalText, optionalUrl, requiredText, requiredUrl } from "./common";

export const socialLinkSchema = z.object({
  label: requiredText("Link label", 2, 30),
  url: requiredUrl,
});

export const siteSettingsSchema = z.object({
  name: requiredText("Name", 2, 80),
  title: requiredText("Professional title", 2, 80),
  tagline: requiredText("Tagline", 10, 160),
  description: requiredText("Description", 20, 400),
  email: z.email("Enter a valid email address."),
  phone: optionalPhone,
  location: optionalText(80),
  github: optionalUrl,
  linkedin: optionalUrl,
  twitter: optionalUrl,
  otherSocials: z.array(socialLinkSchema).max(6),
  resumeUrl: optionalUrl,
  availabilityStatus: z.enum(AVAILABILITY_STATUSES),
  availabilityLabel: requiredText("Availability label", 3, 60),
  heroImageUrls: z.preprocess(
    (value) =>
      Array.isArray(value)
        ? value.filter((item) => typeof item === "string" && item.trim() !== "")
        : value,
    z.array(z.url("Each hero photo must be a full URL.")).max(6),
  ),
});

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
export type SocialLinkInput = z.infer<typeof socialLinkSchema>;
