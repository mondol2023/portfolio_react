"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Modal built on the native `<dialog>` element.
 *
 * Chosen over a hand-rolled overlay deliberately: `showModal()` gives us focus
 * trapping, background inertness, Escape-to-close and top-layer stacking from
 * the platform, which is both less code and more correct than reimplementing
 * them. We only add the backdrop click and the visual shell.
 */

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  /** Footer actions, laid out right-aligned. */
  footer?: ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const element = dialogRef.current;
    if (!element) return;

    if (open && !element.open) {
      element.showModal();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  // Fires for Escape and for programmatic `close()` alike, keeping React state
  // in sync with whatever the platform did.
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  // The dialog element fills the viewport in the top layer, so a click that
  // lands on it rather than on the panel is a backdrop click.
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDialogElement>) => {
      if (event.target === dialogRef.current) onOpenChange(false);
    },
    [onOpenChange],
  );

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] max-w-lg rounded-card border border-border",
        "bg-surface-raised p-0 text-fg shadow-floating backdrop:bg-black/50",
        "backdrop:backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 p-6 pb-0">
        <div className="min-w-0">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-fg-muted">
              {description}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="-m-1.5 rounded-md p-1.5 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
        >
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">Close dialog</span>
        </button>
      </div>

      {children ? <div className="px-6 pt-4">{children}</div> : null}

      {footer ? (
        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-border bg-bg-subtle/60 px-6 py-4">
          {footer}
        </div>
      ) : (
        <div className="h-6" />
      )}
    </dialog>
  );
}
