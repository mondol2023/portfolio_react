import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { LoginForm } from "@/components/admin/login-form";
import { getCurrentAdmin } from "@/lib/firebase/session";

/**
 * Sign-in screen.
 *
 * Rendered dynamically because it reads the session cookie: an administrator
 * who is already signed in is sent straight to the dashboard rather than being
 * shown a form they do not need.
 */
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) redirect("/admin");

  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden px-4 py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="surface-grid absolute inset-0 [mask-image:radial-gradient(55%_55%_at_50%_45%,black,transparent)]" />
      </div>

      <div className="w-full max-w-sm">
        <div className="rounded-card border border-border bg-surface p-7 shadow-floating sm:p-8">
          <span className="flex size-11 items-center justify-center rounded-full border border-border bg-bg-subtle text-accent">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>

          <h1 className="mt-6 text-xl font-semibold tracking-tight text-fg">Admin sign-in</h1>

          <p className="mt-2 mb-7 text-sm leading-relaxed text-fg-muted">
            Restricted to authorized administrators. Content editing happens here; the public
            site links to this page from nowhere.
          </p>

          <LoginForm />
        </div>

        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 text-sm text-fg-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to the site
        </Link>
      </div>
    </main>
  );
}
