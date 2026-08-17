import type { About, SiteSettings } from "@/lib/types/content";

/**
 * Fallback content.
 *
 * Used when Firestore has not been configured yet (fresh clone, no env vars) or
 * when a singleton document has not been created. It keeps the site renderable
 * and the build green without pretending data exists.
 *
 * TODO(owner): replace every `YOUR_*` token below via /admin/settings — these
 * are deliberate placeholders, not real profile data.
 */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  name: "Nur Mohammed Pavel",
  title: "Senior Software Developer",
  tagline: "I design and build web products that stay maintainable after launch.",
  description:
    "Senior software developer focused on TypeScript, React and Next.js — building fast, accessible, well-architected web applications from first commit to production.",
  email: "pavel@gmail.com",
  phone: undefined,
  location: "YOUR_LOCATION",
  github: "https://github.com/mondol2023",
  linkedin: "https://linkedin.com/in/YOUR_LINKEDIN",
  twitter: undefined,
  otherSocials: [],
  resumeUrl: undefined,
  availabilityStatus: "available",
  availabilityLabel: "Available for new work",
};

/**
 * TODO(owner): rewrite this copy in your own words via /admin/about. It is
 * intentionally generic — it makes no claim about years, clients or outcomes.
 */
export const DEFAULT_ABOUT: About = {
  introduction:
    "I'm a software developer who cares about the part of the job that happens after the demo — the code someone else has to read, extend and debug six months later.",
  philosophy:
    "Good software is mostly good decisions made cheaply reversible. I favour boring, explicit architecture over clever abstractions, strong typing at the boundaries, and interfaces that stay usable with a keyboard and a screen reader.",
  summary:
    "Most of my work sits between product and platform: shipping user-facing features while keeping the underlying system coherent — design systems, data modelling, performance budgets and the deployment pipeline that ties them together.",
  // Empty by design: statistics are a personal claim, so they start unset and
  // are populated by the site owner in /admin/about.
  stats: [],
};
