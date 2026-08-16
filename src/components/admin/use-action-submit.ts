"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/actions/action-result";

/**
 * Bridges a Server Action result back into a react-hook-form.
 *
 * Every admin form does the same four things with a result — surface field
 * errors, toast the outcome, refresh the server data, and sometimes navigate —
 * so it lives here once instead of being re-implemented per form.
 *
 * Server-side field errors are pushed back into the form rather than shown only
 * as a toast: a rejected slug belongs next to the slug input, not in a corner.
 */

interface SubmitOptions {
  successTitle: string;
  successDescription?: string;
  /** Navigated to on success — usually the list the form was opened from. */
  redirectTo?: string;
}

export function useActionSubmit<TValues extends FieldValues>(
  setError: UseFormSetError<TValues>,
) {
  const router = useRouter();
  const { toast } = useToast();

  return useCallback(
    async <TData>(
      run: () => Promise<ActionResult<TData>>,
      options: SubmitOptions,
    ): Promise<ActionResult<TData>> => {
      const result = await run();

      if (result.status === "error") {
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          const message = messages[0];
          if (message) {
            setError(field as Path<TValues>, { type: "server", message });
          }
        }

        toast({
          variant: "error",
          title: "Could not save",
          description: result.message,
        });

        return result;
      }

      toast({
        variant: "success",
        title: options.successTitle,
        description: options.successDescription,
      });

      if (options.redirectTo) {
        router.push(options.redirectTo);
      }
      // Re-fetches the server components behind this page so lists and counts
      // reflect the write immediately.
      router.refresh();

      return result;
    },
    [router, setError, toast],
  );
}
