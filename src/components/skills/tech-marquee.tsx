import type { CSSProperties } from "react";

import { TechTile } from "@/components/ui/tech-tile";
import { clearHoveredSkill, publishHoveredSkill } from "@/lib/store/scene-interaction-store";
import type { Skill } from "@/lib/types/content";
import { cn } from "@/lib/utils/cn";

/**
 * One endlessly scrolling line of the technology chain.
 *
 * The movement is a CSS animation on a track holding the pill list twice (see
 * `.marquee` in `globals.css`) — nothing here measures, subscribes or ticks, so
 * selecting a pill cannot perturb the speed of this row or any other.
 *
 * "Constant speed" is the requirement and duration is what CSS gives us, so the
 * duration is derived from the item count rather than fixed: a row of 20 pills
 * takes twice as long as a row of 10 and both travel at the same
 * pixels-per-second. Pills vary in width by maybe 30%, so this is an
 * approximation — but a stable one, and it costs nothing at runtime.
 *
 * Hovering a pill also publishes its id to `scene-interaction-store`, which is
 * how the 3D skill graph behind the page learns what the reader is looking at
 * (the canvas is `pointer-events-none` and cannot raycast for itself). The
 * writers are imperative store calls, not state — a hover here must not
 * re-render a row, for the same reason selection may not resize one.
 *
 * Selection is drawn with `transform: scale()` alone. Growing a pill by its box
 * — padding, width, an extra label — would change the track's width, and the
 * loop depends on the duplicate starting at exactly half of it; the seam would
 * become visible the moment anything was clicked. A transform is painted, not
 * laid out, so the geometry the animation relies on stays fixed.
 */

/** Seconds of travel per pill. Tuned so a row reads as unhurried, not sleepy. */
const SECONDS_PER_ITEM = 3.6;

/**
 * A row shorter than this leaves visible dead space between the two copies, so
 * short rows repeat until they fill. Repetition happens in whole passes so the
 * loop still contains an exact number of copies of the list.
 */
const MIN_ITEMS = 9;

function fillRow(skills: readonly Skill[]): Skill[] {
  if (skills.length === 0) return [];

  const filled: Skill[] = [];
  while (filled.length < MIN_ITEMS) filled.push(...skills);
  return filled;
}

interface TechMarqueeProps {
  skills: readonly Skill[];
  /** Alternating rows read as a weave rather than a conveyor belt. */
  direction?: "forward" | "reverse";
  /** Accessible name for the row. */
  label: string;
  /** Id of the pill currently zoomed, if it is in this row. */
  activeId: string | null;
  onSelect: (id: string, element: HTMLButtonElement) => void;
}

export function TechMarquee({
  skills,
  direction = "forward",
  label,
  activeId,
  onSelect,
}: TechMarqueeProps) {
  const row = fillRow(skills);
  if (row.length === 0) return null;

  const duration = `${(row.length * SECONDS_PER_ITEM).toFixed(1)}s`;

  return (
    <div
      className="marquee"
      data-direction={direction}
      style={{ "--marquee-duration": duration } as CSSProperties}
    >
      <ul className="marquee-track" aria-label={label}>
        {[0, 1].map((copy) =>
          row.map((skill, index) => {
            /*
             * Everything past the first pass of the original list is pixels, not
             * content: the second copy exists only so the loop has no seam, and
             * the repeat passes only so a short row fills the viewport.
             * Announcing the same stack three or four times over would be worse
             * than useless — and a focusable control inside an `aria-hidden`
             * subtree is itself an error, hence the matching `tabIndex`.
             */
            const duplicate = copy === 1 || index >= skills.length;
            const active = skill.id === activeId;

            return (
              <li
                key={`${copy}-${index}-${skill.id}`}
                aria-hidden={duplicate || undefined}
                // Lifted so the scaled pill sits over its neighbours rather than
                // under whichever one happens to paint later.
                className={cn("mr-3 shrink-0 sm:mr-4", active && "relative z-10")}
              >
                <button
                  type="button"
                  onClick={(event) => onSelect(skill.id, event.currentTarget)}
                  onPointerEnter={() => publishHoveredSkill(skill.id)}
                  onPointerLeave={() => clearHoveredSkill(skill.id)}
                  // Keyboard reaches the same reaction; duplicates are not
                  // focusable, so only the real pills can fire these.
                  onFocus={() => publishHoveredSkill(skill.id)}
                  onBlur={() => clearHoveredSkill(skill.id)}
                  aria-pressed={active}
                  tabIndex={duplicate ? -1 : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-full border bg-surface py-2 pr-4 pl-2 shadow-sm",
                    "transition-[transform,border-color,box-shadow] duration-300 ease-out",
                    "motion-safe:hover:scale-105",
                    active
                      ? "scale-120 border-tone shadow-lg ring-2 ring-tone/30"
                      : "border-border hover:border-tone",
                  )}
                >
                  <TechTile name={skill.name} iconUrl={skill.iconUrl} size="sm" />
                  <span className="text-sm font-medium whitespace-nowrap text-fg">{skill.name}</span>
                </button>
              </li>
            );
          }),
        )}
      </ul>
    </div>
  );
}
