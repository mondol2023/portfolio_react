import { Sparkles, X } from "lucide-react";
import { forwardRef, type CSSProperties } from "react";

import { TechTile } from "@/components/ui/tech-tile";
import { PROFICIENCY_LABELS, SKILL_CATEGORY_LABELS, type Skill } from "@/lib/types/content";
import { cn } from "@/lib/utils/cn";

/**
 * The floating card a clicked pill opens.
 *
 * Positioned by the parent (`TechChain`) in viewport coordinates, because the
 * marquee it floats above clips its own overflow — anything absolutely placed
 * inside a row would be cut off the moment it grew taller than the row's
 * padding. `fixed` here lets the card sit above the chain instead of inside it.
 *
 * The little diamond is drawn as a rotated square rather than a CSS triangle so
 * it can share the card's own border and background — a triangle border trick
 * only gives you one edge colour, not a matching stroke on two sides.
 */

interface SkillCardProps {
  skill: Skill;
  placement: "top" | "bottom";
  style: CSSProperties;
  /** Offset of the pointer from the card's own left edge, in pixels. */
  arrowOffset: number;
  onClose: () => void;
}

export const SkillCard = forwardRef<HTMLDivElement, SkillCardProps>(function SkillCard(
  { skill, placement, style, arrowOffset, onClose },
  ref,
) {
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`${skill.name} details`}
      style={style}
      className="fixed z-50 w-72 max-w-[calc(100vw-1.5rem)] rounded-card border border-tone/40 bg-surface-raised p-4 text-left shadow-floating"
    >
      <span
        aria-hidden="true"
        style={{ left: arrowOffset }}
        className={cn(
          "absolute size-3 -translate-x-1/2 rotate-45 border-tone/40 bg-surface-raised",
          placement === "top"
            ? "-bottom-[7px] border-r border-b"
            : "-top-[7px] border-t border-l",
        )}
      />

      <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 rounded-md p-1 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
      >
        <X className="size-3.5" aria-hidden="true" />
        <span className="sr-only">Close</span>
      </button>

      <div className="flex items-center gap-3 pr-5">
        <TechTile name={skill.name} iconUrl={skill.iconUrl} size="md" />
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{skill.name}</p>
          <p className="text-xs text-tone">{SKILL_CATEGORY_LABELS[skill.category]}</p>
        </div>
      </div>

      {/*
       * Opening this card is what "discovering" a skill means — so the tag is
       * unconditional, not a state to track and diff. Decorative flourish only;
       * the category label above it already carries the same information for
       * assistive tech, so this is hidden from it rather than announced twice.
       */}
      <p
        aria-hidden="true"
        className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-accent uppercase"
      >
        <Sparkles className="size-3" aria-hidden="true" />
        Discovered
      </p>

      {skill.proficiency || skill.description ? (
        <div className="mt-3 space-y-1.5 text-sm">
          {skill.proficiency ? (
            <p className="font-medium text-fg">{PROFICIENCY_LABELS[skill.proficiency]}</p>
          ) : null}
          {skill.description ? (
            <p className="leading-relaxed text-fg-muted">{skill.description}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
