"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast";
import { ToggleField } from "@/components/ui/toggle-field";
import { setLivingRiverEnabledAction } from "@/lib/actions/scenery-actions";

/**
 * The one switch that swaps the site's backdrop for the live 3D river.
 *
 * Its own control rather than another row in `<AnimationToggles />` for the
 * same reason it has its own Firestore document: it is not one effect among
 * thirty that the surprise button may roll at random, it is a choice between
 * two mutually exclusive scenes. Putting it in that list would let a visitor's
 * dice land on a full-viewport WebGL scene stacked on top of the CSS one.
 *
 * Same optimistic behaviour as the animation switches, and for the same
 * reason: a toggle that waits for Firestore and a revalidation before it moves
 * reads as broken. `router.refresh()` afterwards re-renders the public shell's
 * server data, which is what actually changes what visitors get.
 */

interface SceneryToggleProps {
  /** Straight from Firestore, and the authority whenever new props arrive. */
  enabled: boolean;
}

export function SceneryToggle({ enabled }: SceneryToggleProps) {
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  // The server wins on every genuine prop change — our own refresh, or another
  // admin in another tab — but a re-render with the same value leaves an
  // in-flight toggle where it is.
  const [serverValue, setServerValue] = useState(enabled);

  if (serverValue !== enabled) {
    setServerValue(enabled);
    setOn(enabled);
  }

  async function handleToggle(next: boolean) {
    setBusy(true);
    setOn(next);

    const result = await setLivingRiverEnabledAction(next);
    setBusy(false);

    if (result.status === "error") {
      setOn(!next);
      toast({ variant: "error", title: "Could not update", description: result.message });
      return;
    }

    toast({
      variant: "success",
      title: next ? "The living river is on" : "Back to the painted river",
      description: next
        ? "Visitors now get the 3D scene, and it reacts to them."
        : "The site returns to the quieter CSS scenery.",
    });

    startTransition(() => router.refresh());
  }

  return (
    <div className="px-5 py-4">
      <ToggleField
        label="Living river (3D)"
        description="Ray-traced water, a real day cycle, boats that ride the swell, birds that scatter from the cursor. Replaces the painted river scene — the two cannot run together."
        checked={on}
        disabled={busy}
        onChange={(event) => {
          void handleToggle(event.target.checked);
        }}
      />

      <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
        Heavier than the other animations: it renders on the GPU and drops its
        own resolution on slower machines rather than dropping frames. Visitors
        who have asked for reduced motion never see it.
      </p>
    </div>
  );
}
