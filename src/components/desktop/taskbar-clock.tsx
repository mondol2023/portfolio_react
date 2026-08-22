"use client";

import { useEffect, useState } from "react";

import { useHydrated } from "@/lib/hooks/use-hydrated";

/**
 * The clock in the corner of the taskbar.
 *
 * Small, and doing nothing useful — which is the point. It is the detail that
 * makes the bar read as a taskbar rather than as a navigation bar that happens
 * to be at the bottom.
 *
 * Nothing renders before hydration. The server's clock is in the server's
 * timezone, so any markup produced there is guaranteed to disagree with the
 * client's first paint.
 */

/** A minute display only needs to be this fresh; a per-second tick is noise. */
const TICK_MS = 10_000;

export function TaskbarClock() {
  const hydrated = useHydrated();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  if (!hydrated) return null;

  const time = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString(undefined, { day: "numeric", month: "short" });

  return (
    <div
      className="hidden shrink-0 flex-col items-end leading-none sm:flex"
      // Hidden from assistive tech on purpose. This is the visitor's own clock
      // read back to them — it tells a screen reader nothing it does not already
      // have, and as a live region it would announce itself every minute.
      aria-hidden="true"
    >
      <span className="text-[11px] font-medium text-fg tabular-nums">{time}</span>
      <span className="text-[10px] text-fg-subtle tabular-nums">{date}</span>
    </div>
  );
}
