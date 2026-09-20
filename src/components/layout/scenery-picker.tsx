"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { getAvailableSceneryIds, getSceneryDefinition, type SceneryId } from "@/lib/experience/scenery";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { useSceneSceneryStore } from "@/lib/store/scene-scenery-store";
import { cn } from "@/lib/utils/cn";

/**
 * Header control for the active scenery (§3 of `SCENERY_SYSTEM_PLAN.md`): a
 * trigger opening a popover of rows, each a swatch, a name and a one-line
 * description, as a `radiogroup`.
 *
 * `useFocusTrap` covers Tab-wrap, Escape and focus-return; the extra
 * `ArrowUp`/`ArrowDown` handling below is this control's own, since the trap
 * doesn't rove focus. Phase A ships one row — `getAvailableSceneryIds()`
 * already reads from `SCENERIES`, so later phases add rows there, not here.
 */
export function SceneryPicker({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useSceneSceneryStore((state) => state.id);
  const setScenery = useSceneSceneryStore((state) => state.setScenery);
  const reducedMotion = useMotionPreference();
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(panelRef, open, () => setOpen(false), triggerRef);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();

    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[role="radio"]') ?? []);
    const currentIndex = items.findIndex((item) => item === document.activeElement);
    const next = items[(currentIndex + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length];
    next?.focus();
  }

  function select(next: SceneryId) {
    setScenery(next, reducedMotion);
    setOpen(false);
    triggerRef.current?.focus();
  }

  const active = getSceneryDefinition(id);

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Scenery: ${active.name}`}
        data-cursor-label="scenery"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200",
          "border-border text-fg-muted hover:border-border-strong hover:text-fg",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        )}
      >
        {active.name}
      </button>

      {open ? (
        <div
          id={panelId}
          ref={panelRef}
          role="radiogroup"
          aria-label="Scenery"
          onKeyDown={onKeyDown}
          className="absolute top-full right-0 z-50 mt-2 w-64 overflow-hidden rounded-card border border-border bg-surface-raised p-1.5 shadow-floating"
        >
          {getAvailableSceneryIds().map((sceneryId) => {
            const definition = getSceneryDefinition(sceneryId);
            const isActive = sceneryId === id;

            return (
              <button
                key={sceneryId}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => select(sceneryId)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors duration-150",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  isActive ? "bg-surface-hover" : "hover:bg-surface-hover",
                )}
              >
                <SceneSwatch id={sceneryId} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-fg">{definition.name}</span>
                  <span className="block truncate text-xs text-fg-subtle">{definition.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <span aria-live="polite" className="sr-only">
        {`Scenery: ${active.name}.`}
      </span>
    </div>
  );
}

/**
 * A 44×28 swatch in pure CSS, per §3 — never a live render target for a menu.
 * Reads the same tone tokens the ambient backdrop does, so it already looks
 * like "the current look" without a `ScenerySkin` (S4) existing yet.
 */
function SceneSwatch({ id }: { id: SceneryId }) {
  return (
    <span
      aria-hidden="true"
      data-scenery-swatch={id}
      className="h-7 w-11 shrink-0 rounded-[6px] border border-border/60"
      style={{
        background: "linear-gradient(135deg, var(--bg) 0%, var(--tone-soft) 55%, var(--tone) 100%)",
      }}
    />
  );
}
