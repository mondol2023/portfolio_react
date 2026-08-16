import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** Shared admin loading state — a title block plus a few list rows. */
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>

      <div className="mb-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-3 h-4 w-full max-w-md" />
      </div>

      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="rounded-card border border-border bg-surface p-5">
            <Skeleton className="h-5 w-48" />
            <SkeletonText lines={2} className="mt-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
