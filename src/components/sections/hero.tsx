import { ArrowDownRight, ArrowUpRight, Mail } from "lucide-react";

import { AnimatedText } from "@/components/motion/animated-text";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { buttonClasses } from "@/components/ui/button";
import { HeroPhoto } from "@/features/river-scenery/hero-photo";
import type { AvailabilityStatus, SiteSettings } from "@/lib/types/content";
import { cn } from "@/lib/utils/cn";
import { resolveEmailLink, resolveSocialLinks } from "@/lib/utils/social";

/**
 * Hero.
 *
 * Photo-free by default — the first screen sells the work, not a headshot —
 * but the admin can set `settings.heroImageUrls` to one or more licensed
 * photos, rendered behind the grid/glow by `HeroPhoto` (crossfading between
 * them on a timer when there's more than one). Every other section stays
 * procedural regardless: only this one screen ever gets a real photograph.
 * The entrance runs on mount (nothing above it to scroll past) and follows a
 * fixed reading order — status, name, title, positioning, description,
 * actions, links — so the sequence matches the way the block is meant to be
 * read.
 *
 * Everything in this file except `HeroPhoto` is (or wraps) an already-client
 * primitive, so this component itself stays a server component regardless.
 */

const AVAILABILITY_DOT: Record<AvailabilityStatus, string> = {
  available: "bg-success",
  open: "bg-warning",
  unavailable: "bg-fg-subtle",
};

export function Hero({ settings }: { settings: SiteSettings }) {
  const socials = resolveSocialLinks(settings);
  const email = resolveEmailLink(settings);
  const isAvailable = settings.availabilityStatus !== "unavailable";

  return (
    <section
      id="home"
      aria-label="Introduction"
      data-tone="hero"
      data-tone-anchor=""
      // No scroll veil here: the hero animates on mount, and fading the first
      // screen in from a scroll position it starts at would mean fading it in
      // from nothing on load.
      className="relative isolate scroll-mt-24 overflow-hidden pt-36 pb-20 sm:pt-44 sm:pb-28"
    >
      {/* Decorative only — hidden from assistive tech and non-interactive. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {settings.heroImageUrls.length > 0 ? (
          // A photo and the blueprint grid read as clutter together, so the
          // photo replaces it rather than sitting under it.
          <HeroPhoto srcs={settings.heroImageUrls} />
        ) : (
          <>
            <div className="surface-grid absolute inset-0 [mask-image:radial-gradient(75%_60%_at_50%_0%,black,transparent)]" />
            <div className="glow-accent absolute inset-x-0 top-0 h-[32rem]" />
          </>
        )}
      </div>

      <div className="container-page">
        <Stagger triggerOnMount delayChildren={0.08} step={0.09} className="max-w-4xl">
          <StaggerItem>
            <p className="inline-flex items-center gap-2.5 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-xs font-medium text-fg-muted backdrop-blur-sm">
              <span className="relative flex size-2">
                {isAvailable ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inline-flex size-full animate-ping rounded-full opacity-60",
                      AVAILABILITY_DOT[settings.availabilityStatus],
                    )}
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative inline-flex size-2 rounded-full",
                    AVAILABILITY_DOT[settings.availabilityStatus],
                  )}
                />
              </span>
              {settings.availabilityLabel}
            </p>
          </StaggerItem>

          <AnimatedText
            as="h1"
            text={settings.name}
            delay={0.18}
            className="mt-8 text-display font-semibold text-fg"
          />

          <StaggerItem className="mt-6 flex items-center gap-4">
            <span aria-hidden="true" className="h-px w-10 bg-border-strong" />
            <p className="font-serif text-2xl text-accent italic sm:text-3xl">{settings.title}</p>
          </StaggerItem>

          <StaggerItem className="mt-8 max-w-2xl space-y-4">
            <p className="text-lead font-medium text-fg">{settings.tagline}</p>
            <p className="text-lead text-fg-muted">{settings.description}</p>
          </StaggerItem>

          <StaggerItem className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            {/*
             * Plain anchors, not `<Link>`. Both targets are sections of this
             * same page, and the App Router skips its scroll handler when a
             * navigation produces no new cache node — which is every same-route
             * hash link, so `/#contact` would update the URL and go nowhere.
             * The browser's own anchor handling has no such gap, and it already
             * honours the `scroll-behavior` and `scroll-padding-top` set on
             * <html>. It also costs no JavaScript and no prefetch of a route we
             * are already on.
             */}
            <a href="#projects" className={buttonClasses("primary", "lg")}>
              View selected work
              <ArrowDownRight className="size-4" aria-hidden="true" />
            </a>
            <a href="#contact" className={buttonClasses("secondary", "lg")}>
              <Mail className="size-4" aria-hidden="true" />
              Get in touch
            </a>
          </StaggerItem>

          {socials.length > 0 || email ? (
            <StaggerItem className="mt-12">
              <ul className="flex flex-wrap items-center gap-x-6 gap-y-3">
                {email ? (
                  <li>
                    <a
                      href={email.href}
                      className="text-sm text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
                    >
                      {email.display}
                    </a>
                  </li>
                ) : null}
                {socials.map((social) => (
                  <li key={social.href}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group inline-flex items-center gap-1 text-sm text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
                    >
                      {social.label}
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </StaggerItem>
          ) : null}
        </Stagger>
      </div>
    </section>
  );
}
