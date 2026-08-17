import type { SiteSettings } from "@/lib/types/content";

/**
 * Turns the flat settings document into the list the UI actually renders.
 *
 * Placeholder values are filtered out rather than linked. `DEFAULT_SITE_SETTINGS`
 * ships `YOUR_GITHUB` / `YOUR_LINKEDIN` tokens so the owner can see what to fill
 * in from the admin panel — but shipping them as live `<a href>` would put dead
 * links on a public page, so anything still holding a token is dropped here.
 */

const PLACEHOLDER = /YOUR_[A-Z_]+/;

/** True while a settings value is still an unreplaced placeholder token. */
export function isPlaceholder(value: string | undefined | null): boolean {
  return typeof value === "string" && PLACEHOLDER.test(value);
}

/** Returns the value only if it has been filled in for real. */
export function realValue(value: string | undefined | null): string | undefined {
  if (!value || isPlaceholder(value)) return undefined;
  return value;
}

export interface SocialLinkView {
  label: string;
  href: string;
  /** Short display form, e.g. `github.com/octocat`. */
  display: string;
  /** Email links stay in-tab; everything else opens externally. */
  external: boolean;
}

/** Strips protocol, `www.` and any trailing slash for display. */
function toDisplay(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}

export function resolveSocialLinks(settings: SiteSettings): SocialLinkView[] {
  const links: SocialLinkView[] = [];

  const push = (label: string, url: string | undefined) => {
    const value = realValue(url);
    if (!value) return;
    links.push({ label, href: value, display: toDisplay(value), external: true });
  };

  push("GitHub", settings.github);
  push("LinkedIn", settings.linkedin);
  push("X", settings.twitter);

  for (const social of settings.otherSocials) {
    push(social.label, social.url);
  }

  return links;
}

/**
 * The phone number as a `tel:` URI — and only as a URI.
 *
 * Returns a link rather than a `SocialLinkView` on purpose: there is no
 * `display` field to hand a component, so the number cannot be printed on the
 * page by accident. It is dialled, not read.
 *
 * Everything that is not a digit is dropped, because diallers vary in what
 * punctuation they tolerate, and a leading `+` is restored afterwards — without
 * it an international number silently dials as if it were local.
 */
export function resolvePhoneHref(settings: SiteSettings): string | null {
  const phone = realValue(settings.phone);
  if (!phone) return null;

  const digits = phone.replace(/\D/g, "");
  if (digits === "") return null;

  return `tel:${phone.trimStart().startsWith("+") ? "+" : ""}${digits}`;
}

/** The email link is separate: it is the one contact route that always exists. */
export function resolveEmailLink(settings: SiteSettings): SocialLinkView | null {
  const email = realValue(settings.email);
  if (!email) return null;

  return { label: "Email", href: `mailto:${email}`, display: email, external: false };
}
