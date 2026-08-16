import { redirect } from "next/navigation";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getUnreadMessageCount } from "@/lib/firebase/repositories/messages-repository";
import { getCurrentAdmin } from "@/lib/firebase/session";

/**
 * The routing boundary for every authenticated admin page.
 *
 * `getCurrentAdmin()` verifies the session cookie against Firebase, requires the
 * `admin: true` custom claim, and requires the account to still be on the
 * Firestore allowlist. Anything less redirects to sign-in before a single byte
 * of dashboard markup is produced — an unauthorized visitor never receives the
 * UI at all, rather than receiving it and having it hidden.
 *
 * This is one of three independent layers. It does not stand alone: each Server
 * Action re-checks through `withAdmin()`, and Firestore's own rules reject
 * unauthorized writes even if the application were bypassed entirely.
 */

// Never prerendered or cached — the output depends on who is asking.
export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: LayoutProps<"/admin">) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const unreadCount = await getUnreadMessageCount();

  return (
    <div className="flex min-h-svh flex-col bg-bg-subtle lg:flex-row">
      <AdminSidebar email={admin.email} name={admin.name} unreadCount={unreadCount} />

      <main id="admin-content" className="min-w-0 flex-1 px-4 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
