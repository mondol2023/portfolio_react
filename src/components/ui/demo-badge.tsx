import { FlaskConical } from "lucide-react";

import { Badge } from "@/components/ui/badge";

/**
 * Marks a section that is rendering sample data from `demo-content.ts` because
 * the underlying collection is still empty.
 *
 * It is the honesty half of the demo fallback: the site looks finished on a
 * fresh install without any of the placeholder content passing itself off as the
 * owner's real work. Each badge disappears by itself once that collection has a
 * single real record.
 */
export function DemoBadge({ label = "Sample data" }: { label?: string }) {
  return (
    <Badge variant="warning">
      <FlaskConical aria-hidden="true" className="size-3" />
      {label}
      <span className="sr-only"> — placeholder content, not the site owner&apos;s.</span>
    </Badge>
  );
}
