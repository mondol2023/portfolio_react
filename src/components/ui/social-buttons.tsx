import { Globe } from "lucide-react";

import { getSocialIconPath } from "@/lib/constants/social-brand";
import { cn } from "@/lib/utils/cn";
import type { SocialLinkView } from "@/lib/utils/social";

/**
 * A row of social profile links drawn as icon buttons.
 *
 * Marks rather than words, because a row of logos is recognised at a glance in
 * the two places this appears — the corner of the contact block and the foot of
 * the page — where the reader is scanning for a way out, not reading.
 *
 * The name never disappears: every button carries it as visually hidden text,
 * so screen readers and keyboard users get "GitHub (opens in a new tab)" rather
 * than an unlabelled square. A network we ship no mark for still renders — as a
 * globe — because a working link with a generic icon beats a missing link.
 *
 * A server component; nothing here needs the browser.
 */

function SocialIcon({ label, className }: { label: string; className?: string }) {
  const path = getSocialIconPath(label);

  // Lucide's globe is a stroked 24x24 icon and the brand marks are filled, so
  // they are drawn differently on purpose rather than forced to match.
  if (!path) return <Globe aria-hidden="true" className={className} />;

  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d={path} />
    </svg>
  );
}

export function SocialButtons({
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
          <a
            href={social.href}
            target={social.external ? "_blank" : undefined}
            rel={social.external ? "noreferrer noopener" : undefined}
            title={social.label}
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-fg-muted",
              "transition duration-200 hover:-translate-y-0.5 hover:border-accent hover:bg-surface-hover hover:text-accent",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            )}
          >
            <SocialIcon label={social.label} className="size-[18px]" />
            <span className="sr-only">
              {social.label}
              {social.external ? " (opens in a new tab)" : ""}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
