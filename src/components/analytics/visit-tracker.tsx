"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Records a pageview once per path per tab.
 *
 * Renders nothing. The public pages are static, so this beacon is what turns a
 * request into a tracked visit — and it can report the screen, timezone and
 * language, which no header carries.
 */
export function VisitTracker() {
  const pathname = usePathname();
  // Survives the double-invoked effect in development.
  const sent = useRef<string | null>(null);

  useEffect(() => {
    if (sent.current === pathname) return;
    sent.current = pathname;

    const body = JSON.stringify({
      path: pathname,
      referrer: document.referrer || undefined,
      screen: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    });

    // `keepalive` lets the request outlive a navigation away from the page.
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Analytics must never break the page.
    });
  }, [pathname]);

  return null;
}
