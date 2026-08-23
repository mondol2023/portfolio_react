import { Transmission } from "@/components/experience/transmission/transmission";
import { SectionHeading } from "@/components/ui/section-heading";
import type { SiteSettings } from "@/lib/types/content";
import {
  realValue,
  resolveEmailLink,
  resolvePhoneHref,
  resolveSocialLinks,
} from "@/lib/utils/social";

import { Section, headingId } from "./section";

/**
 * Contact — "OPEN A TRANSMISSION".
 *
 * A Server Component still: it resolves the settings document into the plain
 * values the channel panel renders, and hands them to `Transmission`, which
 * owns the browser-side half. The email address is always shown as a plain
 * link — a form that fails for any reason should never be the only way to
 * reach someone.
 */

const SECTION_ID = "contact";

export function Contact({ settings }: { settings: SiteSettings }) {
  const email = resolveEmailLink(settings);
  const phoneHref = resolvePhoneHref(settings);
  const socials = resolveSocialLinks(settings);
  const location = realValue(settings.location);

  return (
    // `exit={false}`: nothing follows this section, so its bottom edge never
    // reaches the top of the viewport — the exit fade would have no way to
    // finish and would leave the form permanently dimmed.
    <Section id={SECTION_ID} tone="contact" exit={false}>
      <SectionHeading
        id={headingId(SECTION_ID)}
        eyebrow="05 — Contact"
        title="Open a transmission"
        description="Have a project, a role or a question? Open a channel and I'll reply."
      />

      <Transmission
        email={email}
        phoneHref={phoneHref}
        socials={socials}
        location={location}
        availability={settings.availabilityLabel}
      />
    </Section>
  );
}
