/**
 * Public navigation. The admin panel is deliberately absent — it is never
 * linked from any public surface.
 */
export interface NavItem {
  /** Section id used for the anchor and for scroll-spy. */
  id: string;
  label: string;
  href: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: "home", label: "Home", href: "/#home" },
  { id: "about", label: "About", href: "/#about" },
  { id: "skills", label: "Skills", href: "/#skills" },
  { id: "projects", label: "Projects", href: "/#projects" },
  { id: "experience", label: "Experience", href: "/#experience" },
  { id: "contact", label: "Contact", href: "/#contact" },
] as const;

export const SECTION_IDS = NAV_ITEMS.map((item) => item.id);
