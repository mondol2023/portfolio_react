import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * Archive placeholder. Mirrors the real grid so the layout does not jump when
 * the data arrives.
 *
 * It lives in the `(archive)` route group so the Suspense boundary covers only
 * `/projects` and not `/projects/[slug]`. A case study would otherwise inherit a
 * grid skeleton it never becomes, and — because streaming commits the status
 * line before the data is read — an unknown slug would answer 200 instead of a
 * real 404.
 */
export default function ProjectsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading projects">
      <div className="container-page pt-36 pb-16 sm:pt-44">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-6 h-12 w-64" />
        <SkeletonText lines={2} className="mt-8 max-w-2xl" />
      </div>

      <div className="container-page grid gap-6 pb-24 sm:grid-cols-2 sm:pb-32 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-card border border-border">
            <Skeleton className="aspect-[16/9] rounded-none" />
            <div className="p-6">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-4 h-6 w-3/4" />
              <SkeletonText lines={2} className="mt-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
