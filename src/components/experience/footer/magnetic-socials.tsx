"use client";

import { Magnetic } from "@/components/experience/magnetic";
import { SocialIcon } from "@/components/ui/social-icon";
import { cn } from "@/lib/utils/cn";
import type { SocialLinkView } from "@/lib/utils/social";

/**
 * The footer's exit row: the same marks as `SocialButtons`, with the site's
 * magnetic pull on them.
 *
 * A separate component rather than a `magnetic` prop on `SocialButtons`,
 * because that prop would drag the whole thing across the client boundary —
 * including the copy of it in the contact panel, which has no need to be
 * interactive. The mark itself is shared through `SocialIcon`, so the two rows
 * can never drift apart visually.
 *
 * `Magnetic` already holds still under reduced motion, so there is no second
 * check for it here.
 */
export function MagneticSocials({
  links,
  className,
}: {
  links: readonly SocialLinkView[];
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap items-center gap-2", className)}>
      {links.map((social) => (
        <li key={social.href}>
          <Magnetic strength={0.4} tilt={12}>
            <a
              href={social.href}
              target={social.external ? "_blank" : undefined}
              rel={social.external ? "noreferrer noopener" : undefined}
              title={social.label}
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-fg-muted",
                "transition-colors duration-200 hover:border-tone hover:bg-tone-soft hover:text-tone",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone",
              )}
            >
              <SocialIcon label={social.label} className="size-[18px]" />
              <span className="sr-only">
                {social.label}
                {social.external ? " (opens in a new tab)" : ""}
              </span>
            </a>
          </Magnetic>
        </li>
      ))}
    </ul>
  );
}
