"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/actions/action-result";
import type { ReorderInput } from "@/lib/validation/common";

/**
 * Move-up / move-down buttons for an ordered list.
 *
 * Keyboard- and screen-reader-friendly by construction, which a drag-and-drop
 * implementation would only be with considerable extra work. The component
 * always sends the *whole* list back with freshly normalised indexes, so gaps
 * and duplicate order values introduced by hand-editing heal on the next move.
 */

interface ReorderControlsProps {
  /** Every row in the list, in the order currently displayed. */
  ids: string[];
  /** Index of the row these controls belong to. */
  index: number;
  action: (items: ReorderInput) => Promise<ActionResult>;
  /** Names the row, for the buttons' accessible labels. */
  name: string;
}

export function ReorderControls({ ids, index, action, name }: ReorderControlsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const isFirst = index === 0;
  const isLast = index === ids.length - 1;

  async function move(direction: -1 | 1) {
    const target = index + direction;
    const next = [...ids];
    const current = next[index];
    const swapped = next[target];
    // `noUncheckedIndexedAccess` — the disabled state already rules this out,
    // but the compiler cannot know that.
    if (current === undefined || swapped === undefined) return;

    next[index] = swapped;
    next[target] = current;

    const result = await action(next.map((id, order) => ({ id, order })));

    if (result.status === "error") {
      toast({ variant: "error", title: "Could not reorder", description: result.message });
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void move(-1)}
        disabled={isFirst || isPending}
        className="px-2"
      >
        <ChevronUp className="size-4" aria-hidden="true" />
        <span className="sr-only">Move {name} up</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void move(1)}
        disabled={isLast || isPending}
        className="px-2"
      >
        <ChevronDown className="size-4" aria-hidden="true" />
        <span className="sr-only">Move {name} down</span>
      </Button>
    </div>
  );
}
