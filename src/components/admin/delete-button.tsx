"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/actions/action-result";

/**
 * Destructive row action, gated behind a confirmation dialog.
 *
 * The action is passed as a prop rather than imported here so one component
 * serves projects, roles, technologies and messages. A direct reference to an
 * exported Server Action is serializable, so a Server Component can hand it
 * over; an inline closure could not.
 */

interface DeleteButtonProps {
  id: string;
  action: (id: string) => Promise<ActionResult>;
  /** Names the thing being deleted, e.g. the project title. */
  name: string;
  /** Singular noun for the dialog copy, e.g. "project". */
  entity: string;
  successTitle: string;
  /** Where to go afterwards. Stays put and refreshes when omitted. */
  redirectTo?: string;
}

export function DeleteButton({
  id,
  action,
  name,
  entity,
  successTitle,
  redirectTo,
}: DeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  async function handleConfirm() {
    const result = await action(id);

    if (result.status === "error") {
      toast({ variant: "error", title: "Could not delete", description: result.message });
      return;
    }

    toast({ variant: "success", title: successTitle, description: `“${name}” has been removed.` });

    startTransition(() => {
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        isLoading={isPending}
        className="text-danger"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        <span className="sr-only">Delete {name}</span>
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete this ${entity}?`}
        description={`“${name}” will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleConfirm}
      />
    </>
  );
}
