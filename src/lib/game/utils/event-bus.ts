/**
 * Minimal typed publish/subscribe channel.
 *
 * Decouples `GameEngine` from its consumers (the React component) so the
 * engine never needs to know it is running inside React. `subscribe` returns
 * its own unsubscribe function, so callers never hold a reference to the bus.
 */
export class EventBus<Events extends Record<string, unknown>> {
  private readonly listeners = new Map<keyof Events, Set<(payload: never) => void>>();

  subscribe<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): () => void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(handler as (payload: never) => void);
    this.listeners.set(event, set);

    return () => {
      set.delete(handler as (payload: never) => void);
    };
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of set) (handler as (payload: Events[K]) => void)(payload);
  }

  /** Drops every listener. Called once, from `GameEngine.destroy()`. */
  clear(): void {
    this.listeners.clear();
  }
}
