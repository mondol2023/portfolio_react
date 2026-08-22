"use client";

import { DESKTOP_ITEMS } from "./desktop-config";
import { DesktopIcon } from "./desktop-icon";

/**
 * The column of shortcuts in the top-left corner — where a desktop keeps them.
 *
 * Hidden below `md`. A phone screen has no corner to spare, and everything the
 * dock offers is in the start menu, one tap away on the taskbar.
 *
 * `data-no-ripple` keeps the click-ripple effect off the rail: the droplet is
 * for the page, and chrome is not the page.
 */

export function IconDock({ activeSection }: { activeSection: string | null }) {
  return (
    <nav
      aria-label="Desktop shortcuts"
      data-no-ripple
      className="fixed top-3 left-3 z-40 hidden md:block"
    >
      <ul className="flex flex-col gap-0.5">
        {DESKTOP_ITEMS.map((item) => (
          <li key={item.id}>
            <DesktopIcon item={item} active={activeSection === item.id} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
