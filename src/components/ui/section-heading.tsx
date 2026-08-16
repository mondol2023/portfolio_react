import type { ReactNode } from "react";

import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils/cn";

/**
 * The shared header for every public section: a mono eyebrow, an `<h2>` and an
 * optional lead paragraph. Centralising it is what keeps the vertical rhythm
 * and heading level consistent across the page.
 */

interface SectionHeadingProps {
  /** Small uppercase label above the title, e.g. "01 — About". */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Right-aligned slot on wide screens — typically a "view all" link. */
  action?: ReactNode;
  /** Inline slot beside the eyebrow — typically a status pill. */
  note?: ReactNode;
  align?: "left" | "center";
  className?: string;
  /** The heading id, so the enclosing `<section>` can use `aria-labelledby`. */
  id?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  note,
  align = "left",
  className,
  id,
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        centered && "md:flex-col md:items-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", centered && "text-center")}>
        {eyebrow || note ? (
          <Reveal
            className={cn(
              "mb-4 flex flex-wrap items-center gap-3",
              centered && "justify-center",
            )}
          >
            {/* Tone-coloured, with a short rule: the section's colour identity
                announced before its title. `text-tone` sits in the utilities
                layer, so it wins over the colour baked into `.label-mono`. */}
            {eyebrow ? (
              <span className="label-mono flex items-center gap-2.5 text-tone">
                <span aria-hidden="true" className="h-px w-6 bg-tone" />
                {eyebrow}
              </span>
            ) : null}
            {note}
          </Reveal>
        ) : null}

        <Reveal as="h2" id={id} delay={0.05} className="text-section font-semibold text-fg">
          {title}
        </Reveal>

        {description ? (
          <Reveal as="p" delay={0.1} className="text-lead mt-5 text-fg-muted">
            {description}
          </Reveal>
        ) : null}
      </div>

      {action ? (
        <Reveal delay={0.15} className="shrink-0">
          {action}
        </Reveal>
      ) : null}
    </div>
  );
}
