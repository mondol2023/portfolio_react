import { cn } from "@/lib/utils/cn";

/**
 * Loading placeholder for `loading.tsx` boundaries.
 *
 * Marked `aria-hidden` — the boundary itself is what should be announced, not
 * a dozen shimmering rectangles.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-bg-subtle", className)}
    />
  );
}

/** Convenience: a few stacked lines of fake text. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3.5", index === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}
