/**
 * Minimal typed pub/sub.
 *
 * The world talks through events rather than imports: the system that scores a
 * merge must not know an audio system exists. This is the whole contract —
 * subscribe, emit, unsubscribe — deliberately smaller than any library so the
 * module stays dependency-free.
 */
export type EventBusListener<T> = (event: T) => void;

/** What `on` returns — kept as a named type so consumers can store it. */
export type Unsubscribe = () => void;

export interface EventBus<T> {
  /** Subscribes; returns the unsubscribe function. */
  on(listener: EventBusListener<T>): Unsubscribe;
  /** Notifies every listener; one failing listener never breaks the rest. */
  emit(event: T): void;
  /** Drops all listeners (used when the world unmounts). */
  clear(): void;
}

export function createEventBus<T>(): EventBus<T> {
  const listeners = new Set<EventBusListener<T>>();

  return {
    on(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    emit(event) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          // A broken consumer must not take the render loop down with it.
          console.error("[game] event listener failed", error);
        }
      }
    },

    clear() {
      listeners.clear();
    },
  };
}
