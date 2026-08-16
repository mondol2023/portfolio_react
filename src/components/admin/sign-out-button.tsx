"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogOut } from "lucide-react";

import { signOutAdmin } from "@/lib/actions/auth-actions";

/**
 * Sign out.
 *
 * A Server Action rather than a client-side Firebase `signOut()`: the session
 * lives in an httpOnly cookie, so only the server can actually end it. Clearing
 * anything in the browser would be theatre.
 */
export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOutAdmin();
      router.replace("/admin/login");
      // Discards the cached RSC payload of the authenticated pages.
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <LogOut className="size-4 shrink-0" aria-hidden="true" />
      {isPending ? "Signing out…" : "Sign out"}
    </button>
  );
}
