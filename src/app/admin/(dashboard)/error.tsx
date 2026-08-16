"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button";

/**
 * Admin error boundary.
 *
 * Shows the digest rather than the message: the message can carry internals,
 * and the digest is the handle you need to find the real stack in the server
 * logs.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] render failed", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <TriangleAlert className="mx-auto size-8 text-danger" aria-hidden="true" />

      <h1 className="mt-4 text-xl font-semibold tracking-tight text-fg">Something went wrong</h1>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        This screen could not be loaded. Your content is untouched — try again, and if it keeps
        happening check the server logs.
      </p>

      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-fg-subtle">Reference: {error.digest}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <ButtonLink href="/admin" variant="secondary">
          Back to dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
