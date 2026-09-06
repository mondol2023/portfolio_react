"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Info, Trophy, X, XCircle } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Transient feedback for admin mutations.
 *
 * The viewport is an `aria-live="polite"` region, so a screen reader hears the
 * message without focus moving. Errors are not auto-dismissed — a failure the
 * user might have missed is worse than one that lingers.
 */

export type ToastVariant = "success" | "error" | "info" | "achievement";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (input: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 5000;

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  achievement: Trophy,
} as const;

const ACCENTS: Record<ToastVariant, string> = {
  success: "text-success",
  error: "text-danger",
  info: "text-accent",
  // Gold rather than the site accent: an achievement is a different kind of
  // event from "your save worked", and borrowing `--warning` keeps it that
  // way without inventing a new token just for this.
  achievement: "text-warning",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Timers are kept out of state: they are cleanup bookkeeping, not render data.
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: Omit<Toast, "id">) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { ...input, id }]);

      if (input.variant !== "error") {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), AUTO_DISMISS_MS),
        );
      }
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-100 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((item) => {
            const Icon = ICONS[item.variant];
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                className={cn(
                  "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card",
                  "border border-border bg-surface-raised p-4 shadow-floating",
                )}
              >
                <Icon className={cn("mt-0.5 size-5 shrink-0", ACCENTS[item.variant])} aria-hidden="true" />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg">{item.title}</p>
                  {item.description ? (
                    <p className="mt-1 text-sm leading-relaxed text-fg-muted">{item.description}</p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="-m-1 rounded-md p-1 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
                >
                  <X className="size-4" aria-hidden="true" />
                  <span className="sr-only">Dismiss notification</span>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>.");
  }
  return context;
}
