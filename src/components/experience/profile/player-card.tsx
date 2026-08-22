"use client";

import { motion } from "motion/react";

import { VIEWPORT } from "@/components/motion/variants";
import { TiltCard, TiltLayer } from "@/components/experience/tilt-card";
import { SPRING } from "@/lib/experience/springs";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import type { AvailabilityStatus } from "@/lib/types/content";
import type { PlayerLevel } from "@/lib/utils/career";

import { LevelMeter } from "./level-meter";

/**
 * The identity card: PLAYER, CLASS, status, and the level readout.
 *
 * There is no photograph anywhere in `SiteSettings`, so the avatar is a
 * holographic sigil built from the owner's initials inside counter-rotating
 * rings rather than a placeholder headshot. It sits on its own depth layer, so
 * as the card turns it swims slightly against the text — which is what sells it
 * as an object with thickness instead of a printed panel.
 *
 * Everything animated here is decoration over ordinary text. The card still
 * reads as a definition list with the tilt, the rings and the sweep removed.
 */

const STATUS_TEXT: Record<AvailabilityStatus, string> = {
  available: "text-success",
  open: "text-warning",
  unavailable: "text-fg-subtle",
};

interface PlayerCardProps {
  name: string;
  title: string;
  location?: string;
  availabilityStatus: AvailabilityStatus;
  availabilityLabel: string;
  level: PlayerLevel | null;
}

export function PlayerCard({
  name,
  title,
  location,
  availabilityStatus,
  availabilityLabel,
  level,
}: PlayerCardProps) {
  const reducedMotion = useMotionPreference();

  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 40, rotateX: reducedMotion ? 0 : -12 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={VIEWPORT}
      transition={reducedMotion ? { duration: 0.2 } : { type: "spring", ...SPRING.panel }}
    >
      <TiltCard max={10} glare className="w-full">
        <div className="relative overflow-hidden rounded-card border border-tone/40 bg-surface/80 p-7 backdrop-blur-md sm:p-8">
          {/* Faint grid inside the card, masked toward the bottom so the card
              dissolves into its own surface instead of ending on a seam. */}
          <span
            aria-hidden="true"
            className="surface-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]"
          />

          <TiltLayer depth={34} className="relative flex items-center gap-5">
            <Sigil name={name} still={reducedMotion} />
            <div className="min-w-0">
              <p className="label-mono text-tone">Player</p>
              <p className="truncate text-2xl font-semibold text-fg">{name}</p>
            </div>
          </TiltLayer>

          <TiltLayer depth={18} className="relative mt-7">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
              <div className="col-span-2">
                <dt className="label-mono text-fg-subtle">Class</dt>
                <dd className="mt-1.5 text-base font-medium text-fg">{title}</dd>
              </div>

              {location ? (
                <div>
                  <dt className="label-mono text-fg-subtle">Region</dt>
                  <dd className="mt-1.5 text-sm text-fg-muted">{location}</dd>
                </div>
              ) : null}

              <div>
                <dt className="label-mono text-fg-subtle">Status</dt>
                <dd className={`mt-1.5 text-sm font-medium ${STATUS_TEXT[availabilityStatus]}`}>
                  {availabilityLabel}
                </dd>
              </div>
            </dl>
          </TiltLayer>

          {level ? (
            <TiltLayer depth={10} className="relative mt-8 border-t border-border pt-6">
              <LevelMeter level={level} />
            </TiltLayer>
          ) : null}
        </div>
      </TiltCard>
    </motion.div>
  );
}

/**
 * Initials inside two counter-rotating rings.
 *
 * Rotation is a CSS animation rather than a Motion loop — it never changes, so
 * there is nothing for JavaScript to decide each frame, and the compositor can
 * run it while the Skills galaxy below is busy.
 */
function Sigil({ name, still }: { name: string; still: boolean }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span aria-hidden="true" className="relative grid size-16 shrink-0 place-items-center">
      <span
        className="absolute inset-0 rounded-full border border-tone/50 border-t-transparent"
        style={still ? undefined : { animation: "sigil-spin 7s linear infinite" }}
      />
      <span
        className="absolute inset-2 rounded-full border border-tone/30 border-b-transparent"
        style={still ? undefined : { animation: "sigil-spin 4.5s linear infinite reverse" }}
      />
      <span className="absolute inset-3 rounded-full bg-tone-soft" />
      <span className="relative font-mono text-lg font-semibold text-tone">{initials}</span>
    </span>
  );
}
