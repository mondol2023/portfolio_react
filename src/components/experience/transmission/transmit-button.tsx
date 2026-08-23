"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect } from "react";

import { Magnetic } from "@/components/experience/magnetic";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

/**
 * The send control: a button that charges before it fires.
 *
 * The charge is tied to the request, not to a timer pretending to be one. It
 * ramps quickly to `HOLD` and waits there for as long as the Server Action
 * actually takes, then completes to 100 the moment the reply lands. A bar that
 * runs to full on a fixed duration is a lie whenever the network is slower than
 * the animation — and it is exactly then that the visitor is watching it.
 */

export type TransmitStatus = "idle" | "sending" | "sent";

/** Where the ramp parks while it waits for the server. */
const HOLD = 88;

const LABELS: Record<TransmitStatus, string> = {
  idle: "[ TRANSMIT ]",
  sending: "[ CHARGING... ]",
  sent: "[ SIGNAL SENT ]",
};

export function TransmitButton({
  status,
  disabled,
  className,
}: {
  status: TransmitStatus;
  disabled?: boolean;
  className?: string;
}) {
  const reducedMotion = useMotionPreference();
  const charge = useMotionValue(0);
  const width = useTransform(charge, (value) => `${value}%`);

  useEffect(() => {
    if (status === "idle") {
      charge.set(0);
      return;
    }

    const controls = animate(charge, status === "sending" ? HOLD : 100, {
      duration: reducedMotion ? 0 : status === "sending" ? 0.9 : 0.28,
      ease: status === "sending" ? [0.22, 1, 0.36, 1] : "easeOut",
    });

    return () => controls.stop();
  }, [charge, reducedMotion, status]);

  const busy = status !== "idle";

  return (
    <Magnetic strength={busy ? 0 : 0.22} className={className}>
      <button
        type="submit"
        disabled={disabled || busy}
        // The label changes under the visitor mid-submit, so the button
        // announces its own busy state rather than relying on the change.
        aria-live="polite"
        aria-busy={status === "sending"}
        className={cn(
          "group relative isolate overflow-hidden rounded-lg border border-tone/60 bg-surface px-7 py-3.5",
          "font-mono text-xs tracking-[0.22em] text-tone uppercase",
          "transition-colors duration-200 hover:bg-tone-soft",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone",
          "disabled:cursor-not-allowed",
        )}
      >
        {/* The charge fill sits behind the label and never covers it. */}
        <motion.span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 -z-10 bg-tone-soft"
          style={{ width }}
        />

        {/* A sweep that only exists while the request is in flight, so the
            button reads as working rather than merely disabled. */}
        {status === "sending" && !reducedMotion ? (
          <motion.span
            aria-hidden="true"
            className="absolute inset-y-0 -z-10 w-1/3 bg-tone/15"
            animate={{ x: ["-120%", "420%"] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
          />
        ) : null}

        <span className="relative">{LABELS[status]}</span>
      </button>
    </Magnetic>
  );
}
