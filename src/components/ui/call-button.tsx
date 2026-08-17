import { Phone } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/**
 * A phone number offered as an action rather than a string.
 *
 * The number is deliberately absent from the rendered text — the button carries
 * it only in its `tel:` href, so a reader sees an invitation to call, not a
 * number to copy, and it does not sit on the page as plain text for the casual
 * scraper. It is not a secret: the href is still in the source. Unlisted, not
 * hidden.
 *
 * Sized and styled to match `SocialButtons`, since it sits beside them and they
 * read as one row of ways to get in touch.
 *
 * A server component; nothing here needs the browser.
 */
export function CallButton({ href, className }: { href: string; className?: string }) {
  return (
    <a
      href={href}
      title="Call me"
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-fg-muted",
        "transition duration-200 hover:-translate-y-0.5 hover:border-accent hover:bg-surface-hover hover:text-accent",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
    >
      <Phone aria-hidden="true" className="size-[18px]" />
      {/*
       * The label says what the button does, not what the number is: reading it
       * aloud would undo the point of keeping it off the page.
       */}
      <span className="sr-only">Call me</span>
    </a>
  );
}
