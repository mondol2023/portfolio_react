import { FileQuestion } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";

/** Reached when an edit page is opened for an id that no longer exists. */
export default function AdminNotFound() {
  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <FileQuestion className="mx-auto size-8 text-fg-subtle" aria-hidden="true" />

      <h1 className="mt-4 text-xl font-semibold tracking-tight text-fg">Not found</h1>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        This item does not exist any more — it may have been deleted from another session.
      </p>

      <div className="mt-6">
        <ButtonLink href="/admin" variant="secondary">
          Back to dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
