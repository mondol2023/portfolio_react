import { ContactForm } from "@/components/contact/contact-form";
import { Reveal } from "@/components/motion/reveal";
import { CallButton } from "@/components/ui/call-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { SocialButtons } from "@/components/ui/social-buttons";
import type { SiteSettings } from "@/lib/types/content";
import {
  realValue,
  resolveEmailLink,
  resolvePhoneHref,
  resolveSocialLinks,
} from "@/lib/utils/social";

import { Section, headingId } from "./section";

/**
 * Contact.
 *
 * Direct channels on the left, form on the right. The email address is always
 * shown as a plain link: a form that fails for any reason should never be the
 * only way to reach someone.
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
        title="Let's talk"
        description="Have a project, a role or a question? Send a message and I'll reply."
      />

      <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
        <Reveal className="flex flex-col gap-8">
          {email ? (
            <div>
              <p className="label-mono mb-3">Email</p>
              <a
                href={email.href}
                className="text-lg font-medium text-fg underline-offset-4 hover:text-accent hover:underline"
              >
                {email.display}
              </a>
            </div>
          ) : null}

          {/*
           * Sits under the address as its own channel, and unlike it shows a
           * button rather than the value — the number is dialled, not read.
           */}
          {phoneHref ? (
            <div>
              <p className="label-mono mb-3">Phone</p>
              <CallButton href={phoneHref} />
            </div>
          ) : null}

          {socials.length > 0 ? (
            <div>
              <p className="label-mono mb-3">Elsewhere</p>
              <SocialButtons links={socials} />
            </div>
          ) : null}

          {location ? (
            <div>
              <p className="label-mono mb-3">Based in</p>
              <p className="text-sm text-fg-muted">{location}</p>
            </div>
          ) : null}

          <p className="mt-auto text-sm leading-relaxed text-fg-subtle">
            {settings.availabilityLabel}
          </p>
        </Reveal>

        <Reveal delay={0.08} className="rounded-card border border-border bg-surface p-6 sm:p-10">
          <ContactForm />
        </Reveal>
      </div>
    </Section>
  );
}
