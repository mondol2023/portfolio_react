"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { AlertCircle, LogIn } from "lucide-react";

import { signInWithIdToken } from "@/lib/actions/auth-actions";
import { getFirebaseAuth, isFirebaseClientConfigured } from "@/lib/firebase/client";
import { loginDefaults, loginSchema, type LoginInput } from "@/lib/validation/auth-schema";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/**
 * Admin sign-in.
 *
 * The only place in the app that touches the Firebase browser SDK, and it holds
 * the credential for as little time as possible:
 *
 *   1. sign in with in-memory persistence, so nothing is written to IndexedDB
 *   2. mint an ID token and hand it to a Server Action
 *   3. sign the browser SDK straight back out
 *
 * From that point the session is the httpOnly cookie the server set. The client
 * never learns whether the account is an administrator — that decision is made
 * server-side and only ever surfaces as "authorized" or "not".
 */

/** Firebase auth error codes mapped to messages that do not aid enumeration. */
const AUTH_ERRORS: Record<string, string> = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/invalid-email": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
};

function describeAuthError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  return AUTH_ERRORS[code] ?? "Sign-in failed. Please try again.";
}

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const configured = isFirebaseClientConfigured();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: loginDefaults,
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);

    // Imported lazily so the auth bundle is only fetched when someone actually
    // submits — it is by far the heaviest dependency on this page.
    const { inMemoryPersistence, setPersistence, signInWithEmailAndPassword, signOut } =
      await import("firebase/auth");

    const auth = getFirebaseAuth();

    let idToken: string;
    try {
      await setPersistence(auth, inMemoryPersistence);
      const credential = await signInWithEmailAndPassword(auth, values.email, values.password);
      idToken = await credential.user.getIdToken();
    } catch (error) {
      setFormError(describeAuthError(error));
      return;
    } finally {
      // Whether or not the exchange succeeds, the browser keeps no session.
      await signOut(auth).catch(() => undefined);
    }

    const result = await signInWithIdToken(idToken);

    if (result.status === "error") {
      setFormError(result.message);
      return;
    }

    // `refresh()` re-runs the guarded layout with the new cookie attached;
    // without it the dashboard could render against the signed-out RSC cache.
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {!configured ? (
        <p
          role="alert"
          className="flex gap-2.5 rounded-lg border border-warning/30 bg-warning/10 p-3.5 text-sm text-fg-muted"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span>
            Firebase is not configured in this environment. Copy{" "}
            <code className="font-mono text-xs">.env.example</code> to{" "}
            <code className="font-mono text-xs">.env.local</code> and fill it in.
          </span>
        </p>
      ) : null}

      <Field label="Email" error={errors.email?.message} required>
        {(field) => (
          <Input
            {...field}
            {...register("email")}
            type="email"
            autoComplete="username"
            placeholder="you@example.com"
            disabled={!configured}
          />
        )}
      </Field>

      <Field label="Password" error={errors.password?.message} required>
        {(field) => (
          <Input
            {...field}
            {...register("password")}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={!configured}
          />
        )}
      </Field>

      {formError ? (
        <p
          role="alert"
          className="flex gap-2.5 rounded-lg border border-danger/30 bg-danger-subtle p-3.5 text-sm text-danger"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{formError}</span>
        </p>
      ) : null}

      <Button
        type="submit"
        className="mt-1 w-full"
        isLoading={isSubmitting}
        loadingLabel="Signing in"
        disabled={!configured}
      >
        <LogIn className="size-4" aria-hidden="true" />
        Sign in
      </Button>
    </form>
  );
}
