import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Title block for every admin screen. Keeps the heading level, spacing and
 * action placement identical across pages so the CMS reads as one product.
 */
interface AdminPageHeaderProps {
  title: string;
  description?: string;
  /** Buttons or links aligned to the right of the title on wide screens. */
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
}

export function AdminPageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = "Back",
}: AdminPageHeaderProps) {
  return (
    <header className="mb-8">
      {backHref ? (
        <Link
          href={backHref}
          className="mb-4 -ml-1 inline-flex items-center gap-1 text-sm text-fg-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {backLabel}
        </Link>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">{description}</p>
          ) : null}
        </div>

        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
