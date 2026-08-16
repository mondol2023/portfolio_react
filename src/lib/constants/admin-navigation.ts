import {
  FolderKanban,
  LayoutDashboard,
  Mail,
  Settings,
  Sparkles,
  User,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Admin sidebar links.
 *
 * Kept apart from `navigation.ts` on purpose — that file feeds the public
 * header, and these routes must never appear in it.
 */
export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Longest-prefix matching is wrong for "/admin", which every route starts with. */
  exact?: boolean;
}

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/experience", label: "Experience", icon: Sparkles },
  { href: "/admin/skills", label: "Tech stack", icon: Wrench },
  { href: "/admin/about", label: "About", icon: User },
  { href: "/admin/messages", label: "Messages", icon: Mail },
  { href: "/admin/settings", label: "Site settings", icon: Settings },
] as const;

export function isAdminNavItemActive(item: AdminNavItem, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}
