"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast";
import { ToggleField } from "@/components/ui/toggle-field";
import { setSiteLayerEnabledAction } from "@/lib/actions/scenery-actions";

/**
 * The switches for the site's own scenery.
 *
 * Its own control rather than more rows in `<AnimationToggles />` because the
 * two lists answer different questions. That one is "what is the site wearing
 * on top", and every row in it is off until somebody pins it. This is "what the
 * site *is*", and most of these are on until somebody takes them away — so an
 * empty state here means the full backdrop, not a bare page.
 *
 * Same optimistic behaviour as the animation switches, and for the same reason:
 * a toggle that waits for Firestore and a revalidation before it moves reads as
 * broken. `router.refresh()` afterwards re-renders the public shell's server
 * data, which is what actually changes what visitors get.
 */

export interface SiteLayerRow {
  id: string;
  name: string;
  description: string;
  note?: string;
  /** Ids this row switches off when it comes on. Names, for the toast. */
  conflicts: readonly string[];
}

interface SiteLayerTogglesProps {
  rows: readonly SiteLayerRow[];
  /** Current state per id, straight from Firestore. */
  state: Readonly<Record<string, boolean>>;
}

export function SiteLayerToggles({ rows, state }: SiteLayerTogglesProps) {
  const [on, setOn] = useState<Record<string, boolean>>(() => ({ ...state }));
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  /*
   * The server stays the authority: when new props arrive — our own refresh, or
   * another admin in another tab — they replace the optimistic copy. Compared
   * by a stable key rather than by object identity, so a re-render carrying the
   * same values leaves an in-flight toggle where it is.
   */
  const key = rows.map((row) => `${row.id}:${state[row.id] === true}`).join(",");
  const [serverKey, setServerKey] = useState(key);

  if (serverKey !== key) {
    setServerKey(key);
    setOn({ ...state });
  }

  async function handleToggle(row: SiteLayerRow, next: boolean) {
    setBusy(row.id);

    // Mirror the server's conflict rule locally, so the row that is about to be
    // switched off moves now rather than a round-trip later.
    setOn((current) => {
      const draft = { ...current, [row.id]: next };
      if (next) for (const other of row.conflicts) draft[other] = false;
      return draft;
    });

    const result = await setSiteLayerEnabledAction(row.id, next);
    setBusy(null);

    if (result.status === "error") {
      setOn({ ...state });
      toast({ variant: "error", title: "Could not update", description: result.message });
      return;
    }

    const displaced = next
      ? rows.filter((other) => row.conflicts.includes(other.id) && on[other.id] === true)
      : [];

    toast({
      variant: "success",
      title: next ? `${row.name} is on` : `${row.name} is off`,
      description:
        displaced.length > 0
          ? `${displaced.map((other) => other.name).join(" and ")} switched off — they cannot share the page with it.`
          : next
            ? "Every visitor sees it from now on."
            : "Visitors get the page without it.",
    });

    startTransition(() => router.refresh());
  }

  return (
    <div className="divide-y divide-border">
      {rows.map((row) => (
        <div key={row.id} className="px-5 py-4">
          <ToggleField
            label={row.name}
            description={row.description}
            checked={on[row.id] === true}
            disabled={busy === row.id}
            onChange={(event) => {
              void handleToggle(row, event.target.checked);
            }}
          />

          {row.note ? (
            <p className="mt-3 text-xs leading-relaxed text-fg-subtle">{row.note}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
