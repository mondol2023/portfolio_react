"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast";
import { ToggleField } from "@/components/ui/toggle-field";
import { setAnimationEnabledAction } from "@/lib/actions/animation-actions";

/**
 * The on/off switches for the site's animations.
 *
 * Deliberately dumb about what an animation *is*: it takes rows of plain text
 * and ids, so the admin bundle never pulls in the effect modules themselves —
 * the page hands it names, it hands back id + boolean. Everything about how an
 * animation looks lives on the public side.
 *
 * Each switch flips optimistically and reverts if the write fails, because a
 * toggle that waits for a Firestore round-trip and a revalidation before it
 * moves reads as broken. `router.refresh()` afterwards is what re-renders the
 * public shell's server data — without it the site keeps serving the previous
 * set until something else revalidates.
 */

export interface AnimationRow {
  id: string;
  name: string;
  description: string;
}

export interface AnimationSection {
  label: string;
  items: readonly AnimationRow[];
}

interface AnimationTogglesProps {
  groups: readonly AnimationSection[];
  /** Ids currently switched on, straight from Firestore. */
  enabled: readonly string[];
}

function toggled(set: ReadonlySet<string>, id: string, on: boolean): Set<string> {
  const next = new Set(set);
  if (on) next.add(id);
  else next.delete(id);
  return next;
}

export function AnimationToggles({ groups, enabled }: AnimationTogglesProps) {
  const [on, setOn] = useState<ReadonlySet<string>>(() => new Set(enabled));
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  /*
   * The optimistic set is local, but the server stays the authority: when new
   * props arrive — our own refresh, or another admin's change in another tab —
   * they replace it. Comparing the joined ids rather than the array identity
   * means a re-render with the same data leaves an in-flight toggle alone.
   */
  const key = enabled.join(",");
  const [serverKey, setServerKey] = useState(key);

  if (serverKey !== key) {
    setServerKey(key);
    setOn(new Set(enabled));
  }

  async function handleToggle(row: AnimationRow, next: boolean) {
    setBusy(row.id);
    setOn((current) => toggled(current, row.id, next));

    const result = await setAnimationEnabledAction(row.id, next);
    setBusy(null);

    if (result.status === "error") {
      setOn((current) => toggled(current, row.id, !next));
      toast({ variant: "error", title: "Could not update", description: result.message });
      return;
    }

    toast({
      variant: "success",
      title: next ? `${row.name} is on` : `${row.name} is off`,
      description: next
        ? "Every visitor sees it from now on."
        : "The site goes back to normal.",
    });

    startTransition(() => router.refresh());
  }

  return (
    <div className="divide-y divide-border">
      {groups.map((group) => {
        const live = group.items.filter((item) => on.has(item.id));

        return (
          <div key={group.label} className="px-5 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">
                {group.label}
              </h3>

              {/*
                Two in one group are not additive — they change the same thing,
                and the later one simply covers the earlier. Worth saying out
                loud at the moment it happens rather than in a note nobody reads.
              */}
              {live.length > 1 ? (
                <p className="text-xs text-fg-subtle">
                  {live.length} on — they change the same thing, so the one further down wins.
                </p>
              ) : null}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {group.items.map((item) => (
                <ToggleField
                  key={item.id}
                  label={item.name}
                  description={item.description}
                  checked={on.has(item.id)}
                  disabled={busy === item.id}
                  onChange={(event) => {
                    void handleToggle(item, event.target.checked);
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
