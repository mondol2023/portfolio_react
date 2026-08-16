import type { AboutStat, Experience, Project, Skill } from "@/lib/types/content";

/**
 * Demo content.
 *
 * A fresh clone has no Firebase project, and a fresh Firebase project has no
 * documents — either way the public site would render nothing but empty states,
 * which makes the layout impossible to judge. So each public collection falls
 * back to the sample data below while it is empty, and the moment the owner
 * saves a single real project / role / skill the corresponding fallback
 * disappears on its own.
 *
 * None of this is presented as fact. Every record carries the `demo-` id prefix,
 * every affected section renders a "Sample data" badge next to its heading (see
 * `DemoBadge`), the companies and products are invented names, and nothing here
 * is ever written to Firestore — it exists only in this file. Set
 * `PORTFOLIO_DEMO_CONTENT=off` to render the real empty states instead.
 *
 * TODO(owner): replace this by adding real content in /admin. Nothing here needs
 * deleting — it is inert as soon as the collection is non-empty.
 */

/** Every demo record's id starts with this, which is what makes them detectable. */
export const DEMO_ID_PREFIX = "demo-";

export function isDemoId(id: string): boolean {
  return id.startsWith(DEMO_ID_PREFIX);
}

/** True when a rendered list is showing sample data rather than the owner's. */
export function hasDemoContent(items: readonly { id: string }[]): boolean {
  return items.some((item) => isDemoId(item.id));
}

/**
 * The demo fallbacks are on by default and switched off with
 * `PORTFOLIO_DEMO_CONTENT=off`. Read at call time rather than at module scope so
 * the value is not baked into a build.
 */
export function isDemoContentEnabled(): boolean {
  return process.env.PORTFOLIO_DEMO_CONTENT !== "off";
}

// --- Projects ---------------------------------------------------------------

/**
 * Four case studies, deliberately different shapes: a product, a design system,
 * a data pipeline and a small open-source tool. Between them they exercise every
 * optional field, so the detail template can be reviewed properly.
 *
 * No `featuredImage` or `gallery`: the cards and the case-study header fall back
 * to a generated monogram, which keeps the demo working offline and avoids
 * shipping stock photography that would need an image-host allowlist entry.
 */
export const DEMO_PROJECTS: Project[] = [
  {
    id: "demo-atlas",
    title: "Atlas — analytics workspace",
    slug: "atlas-analytics-workspace",
    shortDescription:
      "A self-serve analytics workspace where non-technical teams build dashboards from a governed metric layer instead of ad-hoc SQL.",
    fullDescription:
      "Atlas is a sample product used here to demonstrate the case-study template. It sits between a warehouse and the people who need answers from it: metrics are defined once, versioned, and reused everywhere, so two teams asking the same question get the same number.",
    type: "Web App",
    technologies: ["Next.js", "TypeScript", "PostgreSQL", "Redis", "Tailwind CSS"],
    gallery: [],
    startDate: "2024-02-01",
    endDate: "2025-01-31",
    order: 0,
    featured: true,
    published: true,
    caseStudy: {
      problem:
        "Every team maintained its own spreadsheet of the same handful of metrics. The definitions drifted, nobody could say which number was authoritative, and the weekly review turned into an argument about the data rather than a decision.",
      solution:
        "A metric layer with versioned definitions, plus a dashboard builder that can only compose metrics from that layer. If a definition changes, every dashboard using it changes with it — and the change is reviewable.",
      approach:
        "Server Components render the dashboard shell and fetch aggregates on the server; only the chart interactions ship as client JavaScript. Query results are cached in Redis keyed by metric version, so a definition change invalidates exactly the affected entries instead of the whole cache.",
      challenges:
        "The hard part was not the charts, it was cache invalidation across metric versions. The first design keyed the cache by query text, which meant an upstream definition change silently served stale numbers. Keying by metric version and treating a version bump as the invalidation event made the staleness impossible by construction.",
      results:
        "Sample outcome — replace with your own. The point of this field is that it should hold a measurable result, or be left empty if you do not have one.",
    },
  },
  {
    id: "demo-beacon",
    title: "Beacon — component library",
    slug: "beacon-component-library",
    shortDescription:
      "An accessible React component library and design-token pipeline shared by four product teams, published as a versioned package.",
    fullDescription:
      "Beacon is a sample open-source project used to demonstrate this template. It packages the primitives that every internal product kept rebuilding — dialogs, comboboxes, date pickers, toasts — with keyboard and screen-reader behaviour handled once, correctly.",
    type: "Design System",
    technologies: ["React", "TypeScript", "Tailwind CSS", "Framer Motion"],
    githubUrl: "https://github.com/YOUR_GITHUB/beacon",
    gallery: [],
    startDate: "2023-05-01",
    endDate: "2024-06-30",
    order: 1,
    featured: true,
    published: true,
    caseStudy: {
      problem:
        "Four teams, four dialog implementations, four different focus-trap bugs. Accessibility regressions were being found by users rather than by anyone on the team, and every fix had to be made in four places.",
      solution:
        "One library of unstyled, behaviour-complete primitives plus a token layer for theming, so a product team owns how a component looks and never has to own how it behaves.",
      approach:
        "Design tokens are the contract: they compile from a single source into CSS custom properties, which means light and dark are a variable swap rather than a second set of components. Every primitive ships with its own keyboard-interaction tests, and the reduced-motion preference is honoured at the animation primitive rather than per component.",
      challenges:
        "Adoption, not code. A library nobody migrates to is worse than no library, so the first release deliberately shipped only the four components teams complained about most, with a codemod for each.",
    },
  },
  {
    id: "demo-meridian",
    title: "Meridian — scheduling platform",
    slug: "meridian-scheduling-platform",
    shortDescription:
      "A multi-tenant booking platform handling availability, timezone-correct scheduling and payment holds for independent studios.",
    fullDescription:
      "Meridian is a sample product used to demonstrate this template. It is the boring, high-stakes kind of software: if a booking lands in the wrong timezone or a slot is double-sold, the customer finds out in person.",
    type: "Web App",
    technologies: ["Next.js", "TypeScript", "PostgreSQL", "Node.js", "Docker"],
    gallery: [],
    startDate: "2022-09-01",
    endDate: "2023-08-31",
    order: 2,
    featured: false,
    published: true,
    caseStudy: {
      problem:
        "Studios were coordinating bookings across email, a shared calendar and a spreadsheet. Double-bookings were routine, and every cancellation was handled by hand.",
      solution:
        "A single availability model per studio, with bookings written through a transaction that reserves the slot and the payment hold together — so a failed payment cannot leave an orphaned reservation.",
      approach:
        "All times are stored as UTC instants alongside the IANA zone they were entered in, never as local wall-clock strings. Recurring availability is expanded on read rather than materialised, which keeps a daylight-saving change from rewriting thousands of rows.",
      challenges:
        "Daylight saving. A weekly 09:00 slot is not every 168 hours, and the first implementation quietly moved every recurring booking by an hour twice a year. Storing the rule instead of the expansion fixed the class of bug rather than the instance.",
    },
  },
  {
    id: "demo-signal",
    title: "Signal — status page generator",
    slug: "signal-status-page",
    shortDescription:
      "A small open-source tool that turns health-check results into a static status page with an incident history, deployable anywhere.",
    fullDescription:
      "Signal is a sample open-source project used to demonstrate this template. It exists to make the smallest useful version of a status page: no dashboard, no database, no subscription — a config file, a scheduled check and a static page.",
    type: "Open Source",
    technologies: ["TypeScript", "Node.js", "Vercel"],
    githubUrl: "https://github.com/YOUR_GITHUB/signal",
    gallery: [],
    startDate: "2023-11-01",
    order: 3,
    featured: false,
    published: true,
    caseStudy: {
      problem:
        "Hosted status pages start at a monthly fee that is hard to justify for a side project, and self-hosted alternatives all wanted a database and a worker process for what is fundamentally a cron job and a text file.",
      solution:
        "A CLI that runs the configured checks, appends the result to a committed JSON log and regenerates a static page. The incident history is the git history.",
      approach:
        "The output is a single self-contained HTML file with inlined CSS, so it can be hosted on any static host or object store. Checks are plain async functions, which makes a custom check a five-line file rather than a plugin API.",
    },
  },
];

// --- Experience -------------------------------------------------------------

/**
 * Four roles forming a plausible arc, all at invented companies. The most recent
 * one is open-ended so the "Current" badge and the running-duration formatting
 * are both exercised.
 */
export const DEMO_EXPERIENCES: Experience[] = [
  {
    id: "demo-role-1",
    company: "Northwind Digital",
    position: "Senior Software Developer",
    employmentType: "full-time",
    location: "Remote",
    startDate: "2023-03-01",
    isCurrent: true,
    description:
      "Sample role — replace with your own. Leads front-end architecture for a multi-tenant SaaS product and owns the shared component layer used across its three surfaces.",
    responsibilities: [
      "Set the front-end architecture and review the changes that touch it",
      "Own the design-system package and its release process",
      "Run the performance budget: bundle size, Core Web Vitals, and the alerting around both",
      "Mentor two developers through code review and pairing",
    ],
    technologies: ["TypeScript", "Next.js", "React", "PostgreSQL", "Docker"],
    order: 0,
  },
  {
    id: "demo-role-2",
    company: "Lumen Systems",
    position: "Software Developer",
    employmentType: "full-time",
    location: "Hybrid",
    startDate: "2021-01-01",
    endDate: "2023-02-28",
    isCurrent: false,
    description:
      "Sample role — replace with your own. Built customer-facing features on a scheduling product and migrated its front end from a single-page app to server-rendered React.",
    responsibilities: [
      "Shipped the booking and availability flows end to end",
      "Migrated the client-rendered dashboard to server components, cutting first-load JavaScript",
      "Introduced typed API boundaries between the front end and the service layer",
    ],
    technologies: ["React", "TypeScript", "Node.js", "REST APIs"],
    order: 1,
  },
  {
    id: "demo-role-3",
    company: "Orbit Studio",
    position: "Frontend Developer",
    employmentType: "contract",
    location: "Remote",
    startDate: "2019-06-01",
    endDate: "2020-12-31",
    isCurrent: false,
    description:
      "Sample role — replace with your own. Delivered client web builds on short timelines, working directly with designers to keep the implementation faithful without making it fragile.",
    responsibilities: [
      "Built marketing sites and product front ends from design files",
      "Set up the accessibility checks that became the studio's delivery baseline",
    ],
    technologies: ["JavaScript", "React", "CSS", "Figma"],
    order: 2,
  },
  {
    id: "demo-role-4",
    company: "Kestrel Software",
    position: "Junior Developer",
    employmentType: "full-time",
    location: "On-site",
    startDate: "2018-02-01",
    endDate: "2019-05-31",
    isCurrent: false,
    description:
      "Sample role — replace with your own. First professional role: maintained an internal admin application and learned to work in a codebase older than the tenure of anyone maintaining it.",
    responsibilities: [
      "Maintained and extended internal tooling used by the support team",
      "Wrote the regression tests that made the legacy billing module safe to change",
    ],
    technologies: ["JavaScript", "HTML", "CSS", "SQL"],
    order: 3,
  },
];

// --- Skills -----------------------------------------------------------------

/**
 * A starter stack across all five categories. Proficiency is stated in words —
 * there are no percentages anywhere in this project — and every entry is a
 * technology, not a claim about the owner, so this list is the least fictional
 * part of the demo set.
 */
const DEMO_SKILL_SEED: [name: string, category: Skill["category"], proficiency?: Skill["proficiency"]][] = [
  ["TypeScript", "languages", "expert"],
  ["JavaScript", "languages", "expert"],
  ["SQL", "languages", "proficient"],
  ["HTML", "languages", "expert"],
  ["CSS", "languages", "proficient"],
  ["React", "frontend", "expert"],
  ["Next.js", "frontend", "expert"],
  ["Tailwind CSS", "frontend", "proficient"],
  ["Framer Motion", "frontend", "working"],
  ["Node.js", "backend", "proficient"],
  ["Server Actions", "backend", "proficient"],
  ["REST APIs", "backend", "proficient"],
  ["Firebase Auth", "backend", "working"],
  ["Firestore", "database", "proficient"],
  ["PostgreSQL", "database", "proficient"],
  ["Redis", "database", "working"],
  ["Git", "tools", "expert"],
  ["Docker", "tools", "working"],
  ["Vercel", "tools", "proficient"],
  ["Figma", "tools", "working"],
];

export const DEMO_SKILLS: Skill[] = DEMO_SKILL_SEED.map(
  ([name, category, proficiency], index) => ({
    id: `${DEMO_ID_PREFIX}skill-${index}`,
    name,
    category,
    proficiency,
    order: index,
    enabled: true,
  }),
);

// --- About ------------------------------------------------------------------

/**
 * Placeholder statistics. Numbers about a person are the one part of a portfolio
 * that cannot be inferred, so these are shown only under the "Sample data" badge
 * and are replaced wholesale the first time the owner saves any stat in
 * /admin/about.
 */
export const DEMO_ABOUT_STATS: AboutStat[] = [
  { label: "Years shipping", value: "8+", detail: "Sample figure — set your own in the admin panel." },
  { label: "Projects delivered", value: "30+", detail: "Sample figure — set your own in the admin panel." },
  { label: "Teams supported", value: "4", detail: "Sample figure — set your own in the admin panel." },
  { label: "Open-source repos", value: "12", detail: "Sample figure — set your own in the admin panel." },
];

/**
 * Identity check rather than a value check: the About document has no id to
 * prefix, so "is this the demo set?" is answered by asking whether the array is
 * literally the one exported above. Only the repository fallback can produce it.
 */
export function isDemoAboutStats(stats: readonly AboutStat[]): boolean {
  return stats === DEMO_ABOUT_STATS;
}
