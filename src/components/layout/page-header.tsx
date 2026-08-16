import type { ReactNode } from "react";

import { Stagger, StaggerItem } from "@/components/motion/stagger";
import type { SectionTone } from "@/lib/constants/section-tone";
import { cn } from "@/lib/utils/cn";

/**
 * Header for sub-pages.
 *
 * The hero belongs to the home page alone; every other route gets this quieter
 * version, which keeps the same top offset (so nothing hides behind the fixed
 * navbar) and the same grid backdrop, at a fraction of the vertical weight.
 * It animates on mount rather than on scroll because it starts in view.
 */

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Small right-aligned fact, e.g. a count or a date range. */
  meta?: string;
  /** Slot below the description — links, buttons, tags. */
  children?: ReactNode;
  /** Colour identity for the page, matching the section it belongs to. */
  tone?: SectionTone;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  children,
  tone,
  className,
}: PageHeaderProps) {
  return (
    <header
      data-tone={tone}
      data-tone-anchor={tone ? "" : undefined}
      className={cn("relative isolate overflow-hidden pt-36 pb-16 sm:pt-44", className)}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="surface-grid absolute inset-0 [mask-image:radial-gradient(70%_70%_at_50%_0%,black,transparent)]" />
      </div>

      <div className="container-page">
        <Stagger triggerOnMount step={0.07} className="max-w-3xl">
          {eyebrow || meta ? (
            <StaggerItem className="mb-5 flex items-center gap-3">
              {eyebrow ? <span className="label-mono text-tone">{eyebrow}</span> : null}
              {eyebrow && meta ? (
                <span aria-hidden="true" className="h-px w-6 bg-border-strong" />
              ) : null}
              {meta ? <span className="label-mono">{meta}</span> : null}
            </StaggerItem>
          ) : null}

          <StaggerItem as="h1" className="text-section font-semibold text-fg">
            {title}
          </StaggerItem>

          {description ? (
            <StaggerItem as="p" className="text-lead mt-6 max-w-2xl text-fg-muted">
              {description}
            </StaggerItem>
          ) : null}

          {children ? <StaggerItem className="mt-8">{children}</StaggerItem> : null}
        </Stagger>
      </div>
    </header>
  );
}
