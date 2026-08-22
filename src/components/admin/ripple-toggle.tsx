"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast";
import { ToggleField } from "@/components/ui/toggle-field";
import { setRippleEnabledAction } from "@/lib/actions/ripple-actions";

/**
 * The on/off switch for the water-droplet click ripple.
 *
 * Same optimistic-flip-then-revert shape as `AnimationToggles`, just for a
 * single boolean instead of a set of ids — there is only one ripple, so there
 * is nothing here to group or list.
 */

interface RippleToggleProps {
  /** Current value straight from Firestore. */
  enabled: boolean;
}

export function RippleToggle({ enabled }: RippleToggleProps) {
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  // The server stays the authority: a fresh `enabled` prop (our own refresh,
  // or another admin's change elsewhere) replaces local state, but only when
  // it actually changed — so it doesn't stomp an in-flight toggle.
  const [serverValue, setServerValue] = useState(enabled);
  if (serverValue !== enabled) {
    setServerValue(enabled);
    setOn(enabled);
  }

  async function handleToggle(next: boolean) {
    setBusy(true);
    setOn(next);

    const result = await setRippleEnabledAction(next);
    setBusy(false);

    if (result.status === "error") {
      setOn(!next);
      toast({ variant: "error", title: "Could not update", description: result.message });
      return;
    }

    toast({
      variant: "success",
      title: next ? "Click ripple is on" : "Click ripple is off",
      description: next
        ? "Every visitor sees it from now on."
        : "Clicking empty space no longer does anything.",
    });

    startTransition(() => router.refresh());
  }

  return (
    <ToggleField
      label="Water ripple on click"
      description="Clicking anywhere without clickable content sends a ring of refraction outward from that point."
      checked={on}
      disabled={busy}
      onChange={(event) => {
        void handleToggle(event.target.checked);
      }}
    />
  );
}
