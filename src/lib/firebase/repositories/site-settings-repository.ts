import "server-only";

import { cache } from "react";
import { FieldValue } from "firebase-admin/firestore";

import { DEFAULT_SITE_SETTINGS } from "@/lib/constants/defaults";
import {
  AVAILABILITY_STATUSES,
  type SiteSettings,
  type SocialLink,
} from "@/lib/types/content";
import type { SiteSettingsInput } from "@/lib/validation/site-settings-schema";

import { getAdminDb, requireAdminDb } from "../admin";
import { COLLECTIONS, CONTENT_DOCS } from "../collections";
import {
  readEnum,
  readObjectArray,
  readOptionalString,
  readString,
  stripUndefined,
} from "../converters";

/**
 * Site settings drive the hero, the footer, the contact section and every SEO
 * tag, so this read has to be dependable. It falls back field by field to
 * `DEFAULT_SITE_SETTINGS` rather than all-or-nothing: a partially filled
 * document still contributes what it has.
 */

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const db = getAdminDb();
  if (!db) return DEFAULT_SITE_SETTINGS;

  try {
    const snapshot = await db
      .collection(COLLECTIONS.content)
      .doc(CONTENT_DOCS.siteSettings)
      .get();

    const data = snapshot.data();
    if (!data) return DEFAULT_SITE_SETTINGS;

    const otherSocials: SocialLink[] = readObjectArray(data, "otherSocials")
      .map((link) => ({
        label: readString(link, "label"),
        url: readString(link, "url"),
      }))
      .filter((link) => link.label !== "" && link.url !== "");

    return {
      name: readString(data, "name", DEFAULT_SITE_SETTINGS.name),
      title: readString(data, "title", DEFAULT_SITE_SETTINGS.title),
      tagline: readString(data, "tagline", DEFAULT_SITE_SETTINGS.tagline),
      description: readString(data, "description", DEFAULT_SITE_SETTINGS.description),
      email: readString(data, "email", DEFAULT_SITE_SETTINGS.email),
      phone: readOptionalString(data, "phone"),
      location: readOptionalString(data, "location"),
      github: readOptionalString(data, "github"),
      linkedin: readOptionalString(data, "linkedin"),
      twitter: readOptionalString(data, "twitter"),
      otherSocials,
      resumeUrl: readOptionalString(data, "resumeUrl"),
      availabilityStatus: readEnum(
        data,
        "availabilityStatus",
        AVAILABILITY_STATUSES,
        DEFAULT_SITE_SETTINGS.availabilityStatus,
      ),
      availabilityLabel: readString(
        data,
        "availabilityLabel",
        DEFAULT_SITE_SETTINGS.availabilityLabel,
      ),
    };
  } catch (error) {
    console.error("[settings] getSiteSettings failed", error);
    return DEFAULT_SITE_SETTINGS;
  }
});

export async function updateSiteSettings(input: SiteSettingsInput): Promise<void> {
  await requireAdminDb()
    .collection(COLLECTIONS.content)
    .doc(CONTENT_DOCS.siteSettings)
    .set({
      ...stripUndefined({ ...input }),
      otherSocials: input.otherSocials.map((link) => ({ ...link })),
      updatedAt: FieldValue.serverTimestamp(),
    });
}
