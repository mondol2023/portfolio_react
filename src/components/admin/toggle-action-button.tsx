"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/actions/action-result";

/**
 * One-click boolean flip for a list row — publish, feature, enable.
 *
 * The new value is rendered optimistically so the list does not appear frozen
 * while the write and the revalidation round-trip, and reverts if the action
 * comes back with an error.
 */

interface ToggleActionButtonProps {
  id: string;
  value: boolean;
  action: (id: string, next: boolean) => Promise<ActionResult>;
  /** Button text and accessible label for each state. */
  labelOn: string;
  labelOff: string;
  successTitleOn: string;
  successTitleOff: string;
}

export function ToggleActionButton({
  id,
  value,
  action,
  labelOn,
  labelOff,
  successTitleOn,
  successTitleOff,
}: ToggleActionButtonProps) {
  const [optimistic, setOptimistic] = useState(value);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  async function handleClick() {
    const next = !optimistic;
    setOptimistic(next);

    const result = await action(id, next);

    if (result.status === "error") {
      setOptimistic(!next);
      toast({ variant: "error", title: "Could not update", description: result.message });
      return;
    }

    toast({ variant: "success", title: next ? successTitleOn : successTitleOff });
    startTransition(() => router.refresh());
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick} isLoading={isPending}>
      {optimistic ? labelOn : labelOff}
    </Button>
  );
}
