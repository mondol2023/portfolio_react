import type { Metadata } from "next";

/**
 * Applies to the whole admin tree, sign-in page included.
 *
 * `noindex` is housekeeping, not security — a crawler directive is advisory and
 * protects nothing. The real boundaries are the session check in the dashboard
 * layout, the `withAdmin()` guard on every action, and the Firestore rules.
 */
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
