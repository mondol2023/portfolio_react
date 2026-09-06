/**
 * One-off channel carrying a collect's screen-space origin to the fly-off
 * ghost. Mirrors `systems/split-system.ts`'s `publishPoke`/`subscribePoke`: a
 * plain module-level pub-sub rather than a new `GameEvent` variant, since this
 * is presentation plumbing between two overlay pieces — not something a host
 * listener has any use for.
 */
export interface CollectFlyoffOrigin {
  x: number;
  y: number;
}

const handlers = new Set<(origin: CollectFlyoffOrigin) => void>();

export function subscribeCollectFlyoff(handler: (origin: CollectFlyoffOrigin) => void): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

/** Publishes one collect's screen-space origin; only `GestureController` calls this. */
export function publishCollectFlyoff(origin: CollectFlyoffOrigin): void {
  for (const handler of handlers) handler(origin);
}
