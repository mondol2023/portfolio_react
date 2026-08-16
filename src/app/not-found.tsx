import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";

/**
 * Global 404.
 *
 * Deliberately self-contained rather than wrapped in the site shell: this file
 * sits above the `(site)` route group, so it renders in the root layout only.
 * Duplicating the header here to gain a nav bar would mean two headers to keep
 * in sync for a page nobody should linger on.
 */
export default function NotFound() {
  return (
    <main className="relative isolate flex flex-1 items-center overflow-hidden py-32">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="surface-grid absolute inset-0 [mask-image:radial-gradient(60%_60%_at_50%_40%,black,transparent)]" />
      </div>

      <div className="container-page">
        <div className="max-w-xl">
          <p className="label-mono mb-6">Error 404</p>

          <h1 className="text-section font-semibold text-fg">This page doesn&apos;t exist</h1>

          <p className="text-lead mt-6 text-fg-muted">
            The link may be out of date, or the page may have moved. Everything that is live is
            reachable from the home page.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/">Back home</ButtonLink>
            <ButtonLink href="/projects" variant="secondary">
              Browse projects
            </ButtonLink>
          </div>

          <p className="mt-12 text-sm text-fg-subtle">
            Think something is broken?{" "}
            <Link href="/#contact" className="text-fg underline underline-offset-4">
              Let me know
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
