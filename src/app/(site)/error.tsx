"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button";

/**
 * Public error boundary.
 *
 * Shows the digest, never the message: `error.message` is redacted in
 * production builds anyway, and the digest is the value that actually lets an
 * owner find the matching entry in their server logs.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[site] render error", error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center py-32">
      <div className="container-page">
        <div className="max-w-xl">
          <p className="label-mono mb-6">Something went wrong</p>

          <h1 className="text-section font-semibold text-fg">This page failed to load</h1>

          <p className="text-lead mt-6 text-fg-muted">
            The error has been logged. Trying again often clears it — if it doesn&apos;t, the
            content behind this page may be temporarily unavailable.
          </p>

          {error.digest ? (
            <p className="label-mono mt-6">Reference: {error.digest}</p>
          ) : null}

          <div className="mt-10 flex flex-wrap gap-3">
            <Button onClick={reset}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Try again
            </Button>
            <ButtonLink href="/" variant="secondary">
              Back home
            </ButtonLink>
          </div>
        </div>
      </div>
    </main>
  );
}
