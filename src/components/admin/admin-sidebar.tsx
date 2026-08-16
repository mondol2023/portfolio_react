"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ExternalLink, Menu, X } from "lucide-react";

import {
  ADMIN_NAV_ITEMS,
  isAdminNavItemActive,
  type AdminNavItem,
} from "@/lib/constants/admin-navigation";
import { cn } from "@/lib/utils/cn";

import { SignOutButton } from "./sign-out-button";

/**
 * CMS navigation.
 *
 * One list rendered twice — a permanent rail on large screens and a slide-in
 * drawer below that — so there is a single source of truth for the links and
 * their active state.
 *
 * Client-side only because it needs `usePathname`. It renders no privileged
 * data: everything sensitive is fetched by the server components it sits beside.
 */

interface AdminSidebarProps {
  email: string | null;
  name: string | null;
  /** Badge on the Messages link. Omitted when zero. */
  unreadCount: number;
}

export function AdminSidebar({ email, name, unreadCount }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Escape closes the drawer, matching the dialog convention used elsewhere.
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  // Navigating from inside the drawer has to close it. Doing that on the links
  // themselves — rather than reacting to a pathname change — keeps it to one
  // render and one obvious cause.
  function renderPanel(onNavigate?: () => void): ReactNode {
    return (
      <div className="flex h-full flex-col gap-6 p-5">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg px-1 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span className="size-2.5 rounded-full bg-accent" aria-hidden="true" />
          <span className="text-sm font-semibold tracking-tight text-fg">Portfolio CMS</span>
        </Link>

        <nav aria-label="Admin sections" className="flex-1">
          <ul className="flex flex-col gap-1">
            {ADMIN_NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <AdminNavLink
                  item={item}
                  active={isAdminNavItemActive(item, pathname)}
                  badge={item.href === "/admin/messages" ? unreadCount : 0}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-3 border-t border-border pt-5">
          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 text-xs text-fg-subtle transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            View live site
          </Link>

          <div className="px-3">
            <p className="truncate text-sm font-medium text-fg">{name ?? "Administrator"}</p>
            {email ? <p className="truncate text-xs text-fg-subtle">{email}</p> : null}
          </div>

          <SignOutButton />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile bar. Hidden once the permanent rail is visible. */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-expanded={isOpen}
          aria-controls="admin-drawer"
          className="-ml-1 rounded-lg p-2 text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Menu className="size-5" aria-hidden="true" />
          <span className="sr-only">Open admin navigation</span>
        </button>
        <span className="text-sm font-semibold tracking-tight text-fg">Portfolio CMS</span>
      </div>

      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:sticky lg:top-0 lg:block lg:h-svh">
        {renderPanel()}
      </aside>

      {isOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close admin navigation"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div
            id="admin-drawer"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-border bg-surface shadow-floating"
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 rounded-lg p-2 text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <X className="size-5" aria-hidden="true" />
              <span className="sr-only">Close admin navigation</span>
            </button>
            {renderPanel(() => setIsOpen(false))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function AdminNavLink({
  item,
  active,
  badge,
  onNavigate,
}: {
  item: AdminNavItem;
  active: boolean;
  badge: number;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        active
          ? "bg-accent-subtle font-medium text-accent"
          : "text-fg-muted hover:bg-surface-hover hover:text-fg",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate">{item.label}</span>
      {badge > 0 ? (
        <span className="rounded-full bg-accent px-1.5 py-0.5 text-[0.65rem] leading-none font-semibold text-accent-fg">
          {badge > 99 ? "99+" : badge}
          <span className="sr-only"> unread</span>
        </span>
      ) : null}
    </Link>
  );
}
