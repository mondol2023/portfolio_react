"use client";

import { Sparkle } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { TechChip } from "@/components/ui/tech-chip";
import { EMPLOYMENT_TYPE_LABELS, type Experience as ExperienceEntry } from "@/lib/types/content";
import { formatDateRange } from "@/lib/utils/dates";
import { lookupTechIcon, type TechIconMap } from "@/lib/utils/tech-icons";

/**
 * The modal a timeline card expands into: full description, responsibilities
 * and stack for one role. Built on the shared `Dialog` (native `<dialog>`)
 * rather than `useFocusTrap`, since it's a straightforward trigger-anchored
 * modal — no shared-element `layoutId` animation that would need a hand-rolled
 * overlay instead.
 */

interface RoleSceneProps {
  entry: ExperienceEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  techIcons: TechIconMap;
}

export function RoleScene({ entry, open, onOpenChange, techIcons }: RoleSceneProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={entry?.position ?? ""}
      description={
        entry
          ? `${entry.company} · ${EMPLOYMENT_TYPE_LABELS[entry.employmentType]} · ${formatDateRange(entry.startDate, entry.endDate)}`
          : undefined
      }
      className="max-w-2xl"
    >
      {entry ? (
        <div className="pb-6">
          {entry.description ? (
            <p className="text-sm leading-relaxed text-fg-muted">{entry.description}</p>
          ) : null}

          {entry.responsibilities.length > 0 ? (
            <ul className="mt-5 space-y-2.5">
              {entry.responsibilities.map((item) => (
                <li
                  key={item}
                  className="grid grid-cols-[auto_1fr] gap-x-2.5 text-sm leading-relaxed text-fg-muted"
                >
                  <Sparkle aria-hidden="true" className="mt-1 size-3.5 shrink-0 fill-tone/20 text-tone" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {entry.technologies.length > 0 ? (
            <ul aria-label={`Technologies used at ${entry.company}`} className="mt-6 flex flex-wrap gap-2">
              {entry.technologies.map((tech) => (
                <li key={tech}>
                  <TechChip name={tech} iconUrl={lookupTechIcon(techIcons, tech)} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}
