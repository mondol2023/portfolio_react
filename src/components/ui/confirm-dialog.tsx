"use client";

import { useState } from "react";

import { Button, type ButtonVariant } from "./button";
import { Dialog } from "./dialog";

/**
 * Destructive-action guard. Every delete in the admin panel routes through
 * this, so "are you sure?" is never left to an ad-hoc `window.confirm`.
 *
 * The dialog owns the pending state: the confirm button stays busy until the
 * caller's promise settles, which prevents a double-submit on a slow write.
 */

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "danger",
  onConfirm,
}: ConfirmDialogProps) {
  const [isPending, setIsPending] = useState(false);

  async function handleConfirm() {
    setIsPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      // Runs even if `onConfirm` throws, so a failed delete leaves the dialog
      // open and usable rather than stuck on a spinner.
      setIsPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next);
      }}
      title={title}
      description={description}
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            onClick={handleConfirm}
            isLoading={isPending}
            loadingLabel="Working"
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
