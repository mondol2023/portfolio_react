import {
  Briefcase,
  Cpu,
  FolderOpen,
  Home,
  Mail,
  User,
  type LucideIcon,
} from "lucide-react";

import { NAV_ITEMS, type NavItem } from "@/lib/constants/navigation";
import { DEFAULT_TONE, type SectionTone } from "@/lib/constants/section-tone";

/**
 * Shared vocabulary for the desktop shell.
 *
 * Everything the shell knows about a section is derived from `NAV_ITEMS` rather
 * than restated here: the dock, the start menu and the wallpaper all iterate the
 * same list the old header did, so adding a section stays a one-line change in
 * `navigation.ts`.
 *
 * The nav ids and the tone names were never the same words (`skills`/`stack`,
 * `projects`/`work`), which is why the mapping below exists at all. It is the
 * single place the two vocabularies meet.
 */

/**
 * Taskbar height. Duplicated as a class and a number because layout needs both.
 *
 * The bar is docked to the *top* and hides on scroll-down (`taskbar.tsx`), so
 * this is what panes reserve as `pt-14` and what anchor jumps use as
 * `scroll-padding-top` — not a bottom offset, as it was when the bar lived at
 * the foot of the screen.
 */
export const TASKBAR_HEIGHT_PX = 56;
export const TASKBAR_HEIGHT_CLASS = "h-14";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  about: User,
  skills: Cpu,
  projects: FolderOpen,
  experience: Briefcase,
  contact: Mail,
};

const TONES: Record<string, SectionTone> = {
  home: "hero",
  about: "about",
  skills: "stack",
  projects: "work",
  experience: "experience",
  contact: "contact",
};

export interface DesktopItem extends NavItem {
  icon: LucideIcon;
  tone: SectionTone;
  /** 1-based, shown as a shortcut number the way a taskbar numbers its slots. */
  slot: number;
}

export const DESKTOP_ITEMS: readonly DesktopItem[] = NAV_ITEMS.map((item, index) => ({
  ...item,
  icon: ICONS[item.id] ?? FolderOpen,
  tone: TONES[item.id] ?? DEFAULT_TONE,
  slot: index + 1,
}));

/** The tone the wallpaper should be wearing for a given scroll-spy result. */
export function toneForSection(sectionId: string | null): SectionTone {
  if (!sectionId) return DEFAULT_TONE;
  return TONES[sectionId] ?? DEFAULT_TONE;
}

/**
 * What the taskbar shows before scroll-spy has resolved, or on a route with no
 * sections at all. Spelled out rather than read as `DESKTOP_ITEMS[0]` because
 * `NAV_ITEMS` is a plain array to the type system, so index 0 is optional.
 */
const FALLBACK_ITEM: DesktopItem = {
  id: "home",
  label: "Home",
  href: "/#home",
  icon: Home,
  tone: DEFAULT_TONE,
  slot: 1,
};

export function itemForSection(sectionId: string | null): DesktopItem {
  return DESKTOP_ITEMS.find((item) => item.id === sectionId) ?? FALLBACK_ITEM;
}
