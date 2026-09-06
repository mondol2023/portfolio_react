"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { SkillCard } from "@/components/skills/skill-card";
import { TechMarquee } from "@/components/skills/tech-marquee";
import { gameStore } from "@/lib/store/game-store";
import {
  PROFICIENCY_LABELS,
  SKILL_CATEGORY_LABELS,
  type Skill,
} from "@/lib/types/content";

/**
 * The whole stack as one chain, dealt across three or four scrolling lines.
 *
 * Categories are not what the eye sees any more — the chain is unbroken and
 * mixed — but they are still how a skill is entered in the admin panel, and
 * they are what the caption names when a pill is selected. So the notion
 * survives as information rather than as a heading over every row.
 *
 * Items are dealt round-robin rather than sliced into blocks, which keeps
 * categories mixed down the rows and keeps the row lengths within one item of
 * each other — and equal-length rows matter, because row duration is derived
 * from item count.
 */

/** Roughly how many pills should land on a line before another one is opened. */
const ITEMS_PER_ROW = 7;
const MIN_ROWS = 3;
const MAX_ROWS = 4;

function toRows(skills: readonly Skill[]): Skill[][] {
  const wanted = Math.ceil(skills.length / ITEMS_PER_ROW);
  const count = Math.min(MAX_ROWS, Math.max(MIN_ROWS, wanted));

  const rows = Array.from({ length: count }, (_, row) =>
    skills.filter((_, index) => index % count === row),
  );

  // A stack smaller than the row count would otherwise render empty lines.
  return rows.filter((row) => row.length > 0);
}

interface CardPosition {
  top: number;
  left: number;
  placement: "top" | "bottom";
  /** Pointer offset from the card's own left edge, so it still points at the pill once the card's position is clamped to the viewport. */
  arrowOffset: number;
}

/** Gap between a pill and the card, and the margin the card keeps from the viewport edge. */
const CARD_GAP = 10;
const VIEWPORT_MARGIN = 12;

function positionCard(anchor: HTMLElement, card: HTMLElement): CardPosition {
  const anchorRect = anchor.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();

  const placement: "top" | "bottom" =
    anchorRect.top >= cardRect.height + CARD_GAP + VIEWPORT_MARGIN ? "top" : "bottom";

  const top =
    placement === "top"
      ? anchorRect.top - cardRect.height - CARD_GAP
      : anchorRect.bottom + CARD_GAP;

  const idealLeft = anchorRect.left + anchorRect.width / 2 - cardRect.width / 2;
  const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - cardRect.width - VIEWPORT_MARGIN);
  const left = Math.min(Math.max(idealLeft, VIEWPORT_MARGIN), maxLeft);

  const arrowOffset = anchorRect.left + anchorRect.width / 2 - left;

  return { top, left, placement, arrowOffset };
}

export function TechChain({ skills }: { skills: Skill[] }) {
  const [selection, setSelection] = useState<{ id: string; anchor: HTMLButtonElement } | null>(
    null,
  );
  const [position, setPosition] = useState<CardPosition | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const rows = toRows(skills);
  const active = selection ? (skills.find((skill) => skill.id === selection.id) ?? null) : null;

  // A second click on the same pill puts it back — the card is a toggle, not a
  // trap, and there is nowhere else to click that would obviously dismiss it.
  // Only a genuine open counts as "discovering" the skill, not the close, and
  // the store write happens outside the updater since state setters must stay
  // pure.
  const select = (id: string, element: HTMLButtonElement) => {
    if (selection?.id !== id) gameStore.viewSkill(id);
    setSelection((current) => (current?.id === id ? null : { id, anchor: element }));
  };
  const close = () => setSelection(null);

  // Recomputed on every selection and whenever the layout could have moved the
  // pill under it — scrolling changes fixed-position coordinates directly, and
  // resizing can reflow the chain into different rows.
  useLayoutEffect(() => {
    if (!selection || !cardRef.current) {
      setPosition(null);
      return;
    }

    const reposition = () => {
      if (cardRef.current) setPosition(positionCard(selection.anchor, cardRef.current));
    };

    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [selection]);

  // Dismiss on Escape or a click outside the card — the pill itself is left
  // alone here since its own onClick already handles the toggle.
  useEffect(() => {
    if (!selection) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (cardRef.current?.contains(target)) return;
      if (selection.anchor.contains(target)) return;
      close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selection]);

  return (
    <div>
      <div className="-mx-5 flex flex-col gap-1 md:-mx-8 xl:-mx-10">
        {rows.map((row, index) => (
          <TechMarquee
            key={index}
            skills={row}
            direction={index % 2 === 0 ? "forward" : "reverse"}
            label={`Technologies, line ${index + 1} of ${rows.length}`}
            activeId={selection?.id ?? null}
            onSelect={select}
          />
        ))}
      </div>

      {active ? (
        <SkillCard
          ref={cardRef}
          skill={active}
          placement={position?.placement ?? "top"}
          arrowOffset={position?.arrowOffset ?? 0}
          onClose={close}
          style={
            position
              ? { top: position.top, left: position.left }
              : // First paint, before layout effect has measured the card: kept off
                // screen so nothing flashes at the wrong spot.
                { top: -9999, left: -9999 }
          }
        />
      ) : null}

      {/*
       * The caption is the only part that moves when a pill is selected, and it
       * is outside the marquees on purpose: text inside a row would have to
       * change a pill's width, which is exactly what the seamless loop cannot
       * survive. `min-h` reserves both lines so nothing below it shifts.
       */}
      <p
        aria-live="polite"
        className="mt-6 flex min-h-12 flex-col items-center justify-center gap-1 text-center text-sm text-fg-muted sm:min-h-10"
      >
        {active ? (
          <>
            <span>
              <span className="font-medium text-fg">{active.name}</span>
              <span aria-hidden="true" className="px-2 text-fg-subtle">
                ·
              </span>
              <span className="text-tone">{SKILL_CATEGORY_LABELS[active.category]}</span>
              {active.proficiency ? (
                <>
                  <span aria-hidden="true" className="px-2 text-fg-subtle">
                    ·
                  </span>
                  {PROFICIENCY_LABELS[active.proficiency]}
                </>
              ) : null}
            </span>
            {active.description ? <span>{active.description}</span> : null}
          </>
        ) : (
          <span className="text-fg-subtle">
            Select a technology to discover where it sits in the stack.
          </span>
        )}
      </p>
    </div>
  );
}
