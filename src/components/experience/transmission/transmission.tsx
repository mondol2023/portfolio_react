"use client";

import { useInView } from "motion/react";
import { useRef } from "react";

import { CallButton } from "@/components/ui/call-button";
import { SocialButtons } from "@/components/ui/social-buttons";
import type { SocialLinkView } from "@/lib/utils/social";

import { TerminalBoot } from "./terminal-boot";
import { TransmissionForm } from "./transmission-form";

/**
 * Contact, as an open channel.
 *
 * The client boundary is here rather than around the whole section: the section
 * stays a Server Component and resolves the settings document into plain
 * values, which is data work, and this owns the one thing the server cannot
 * know — whether the reader has actually arrived, which is what starts the
 * handshake above the form.
 *
 * The direct channels are not decoration and are not gated behind anything. A
 * form can fail for reasons neither of us controls, so the address is always on
 * the page, spelled out, as a plain link.
 */

interface TransmissionProps {
  email: SocialLinkView | null;
  phoneHref: string | null;
  socials: readonly SocialLinkView[];
  location?: string;
  availability: string;
}

export function Transmission({
  email,
  phoneHref,
  socials,
  location,
  availability,
}: TransmissionProps) {
  const ref = useRef<HTMLDivElement>(null);
  // `once`: the handshake is a first-arrival event. Re-running it every time the
  // section scrolls back into view would make an established link keep
  // re-establishing itself.
  const inView = useInView(ref, { once: true, margin: "-15% 0px -15% 0px" });

  return (
    <div ref={ref} className="mt-14 grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
      <div className="flex flex-col gap-8">
        <TerminalBoot active={inView} />

        <dl className="flex flex-col gap-7">
          {email ? (
            <div>
              <dt className="font-mono text-[11px] tracking-[0.2em] text-fg-subtle uppercase">
                Direct address
              </dt>
              <dd className="mt-2">
                <a
                  href={email.href}
                  className="font-mono text-sm break-all text-fg underline-offset-4 transition-colors hover:text-tone hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone"
                >
                  {email.display}
                </a>
              </dd>
            </div>
          ) : null}

          {phoneHref ? (
            <div>
              <dt className="font-mono text-[11px] tracking-[0.2em] text-fg-subtle uppercase">
                Voice
              </dt>
              <dd className="mt-2">
                <CallButton href={phoneHref} />
              </dd>
            </div>
          ) : null}

          {socials.length > 0 ? (
            <div>
              <dt className="font-mono text-[11px] tracking-[0.2em] text-fg-subtle uppercase">
                Relay stations
              </dt>
              <dd className="mt-2">
                <SocialButtons links={socials} />
              </dd>
            </div>
          ) : null}

          {location ? (
            <div>
              <dt className="font-mono text-[11px] tracking-[0.2em] text-fg-subtle uppercase">
                Origin
              </dt>
              <dd className="mt-2 text-sm text-fg-muted">{location}</dd>
            </div>
          ) : null}
        </dl>

        <p className="mt-auto border-l-2 border-tone/40 pl-4 text-sm leading-relaxed text-fg-subtle">
          {availability}
        </p>
      </div>

      <div className="rounded-card border border-border bg-surface/70 p-6 backdrop-blur-sm sm:p-9">
        <TransmissionForm />
      </div>
    </div>
  );
}
