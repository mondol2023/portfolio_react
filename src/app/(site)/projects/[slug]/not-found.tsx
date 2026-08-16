import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";

/**
 * Shown when a slug does not resolve to a published project — a real 404 status,
 * inside the public shell so the visitor keeps the nav and can carry on.
 */
export default function ProjectNotFound() {
  return (
    <PageHeader
      tone="work"
      eyebrow="404"
      title="That project isn't here"
      description="The case study you're looking for has been moved, renamed, or was never published. The archive has everything that is live."
      className="pb-32 sm:pb-40"
    >
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/projects">Browse all projects</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Back home
        </ButtonLink>
      </div>
    </PageHeader>
  );
}
