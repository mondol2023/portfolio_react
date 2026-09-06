/**
 * Generic object pool.
 *
 * Particles, fragments and burst descriptors churn at frame frequency; letting
 * the GC see that traffic would show up as periodic stutter. Pools hand out
 * recycled instances and accept them back — `reset` gives each reuse a chance
 * to clear stale fields so callers never observe a previous life.
 */
export interface Pool<T> {
  /** Hands out a recycled instance, or creates one when the idle list is dry. */
  acquire(): T;
  /** Returns an instance to the idle list (calls `reset` when provided). */
  release(item: T): void;
  /** Instances currently checked out — the live population. */
  readonly live: number;
  /** Drops every idle instance (used on world teardown). */
  clear(): void;
}

export function createPool<T>(create: () => T, reset?: (item: T) => void): Pool<T> {
  const idle: T[] = [];
  let liveCount = 0;

  return {
    acquire() {
      const item = idle.pop() ?? create();
      liveCount += 1;
      return item;
    },

    release(item) {
      reset?.(item);
      idle.push(item);
      liveCount -= 1;
    },

    get live() {
      return liveCount;
    },

    clear() {
      idle.length = 0;
      liveCount = 0;
    },
  };
}
