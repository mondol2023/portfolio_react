# Developer Portfolio — Implementation Plan

Status: **planning** · Target stack: Next.js 16 (App Router) + TypeScript + Tailwind CSS + Framer Motion + Firebase/Firestore

This document is the single source of truth for building the project. It is written before any code exists so that implementation can proceed in verifiable, incremental phases. Update this file as decisions change — it should stay accurate, not just historical.

---

## 1. Goals & Non-Goals

**Goals**
- A public, content-rich developer portfolio (Hero, About, Tech Stack, Projects/Case Studies, Experience, Contact).
- A protected `/admin` CMS backed by Firestore, gated by real admin authorization (not just "is logged in").
- Production-grade code: typed, linted, buildable, accessible, performant, SEO-ready.
- Original visual design inspired by (not cloned from) aayushbharti.in and abhayrana.com.

**Non-Goals**
- No separate backend server (Express/Nest/etc.) — Next.js Route Handlers + Server Components + Server Actions only.
- No fabricated résumé content — all personal content ships as clearly-marked placeholders (`YOUR_NAME`, etc.), real data is entered later via `.env` / Firestore / admin UI.
- No animation-for-its-own-sake — motion must communicate hierarchy, state, or feedback.

---

## 2. Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16, App Router | RSC by default, `"use client"` only where needed |
| Language | TypeScript, `strict: true` | no `any` in new code |
| Styling | Tailwind CSS v4 | design tokens via CSS variables, `next/font` for type |
| Animation | Framer Motion (`motion/react`) | small internal animation-primitives layer, respects `prefers-reduced-motion` |
| Data | Firebase (Firestore) | client SDK for public reads, Admin SDK for server writes/verification |
| Auth | Firebase Authentication (email/password) | custom claim `admin: true` checked server-side |
| Validation | Zod | shared schemas for forms + Firestore writes |
| Forms | React Hook Form + Zod resolver | contact form + all admin forms |
| Icons | `lucide-react` | tree-shakeable, no icon-font |
| Lint/Format | ESLint (`next/core-web-vitals`, `next/typescript`), Prettier | must pass with 0 errors before "done" |
| Deployment target | Vercel (documented), but no vendor lock-in beyond Next.js itself | |

---

## 3. High-Level Architecture

```
Browser (public)                 Browser (admin)
      │                                 │
      ▼                                 ▼
 Server Components  ──fetch──▶  Firestore (client SDK, public reads only,
 (RSC, cached/revalidated)       rules restrict writes to admins)
      │
      ▼
 Route Handlers / Server Actions ──▶ Firebase Admin SDK (service account,
 (contact form, admin mutations)      server-only, verifies ID token + custom
                                       claim before every write)
```

Key rule: **UI components never talk to Firestore directly.** All reads/writes go through a repository layer in `src/lib/firebase/*-repository.ts`. Server Components call repositories directly (server-side Firestore access via Admin SDK for anything requiring trust, client SDK + rules for public cached reads where appropriate). Client Components never import Firestore SDKs — they call Server Actions.

### Authorization model (explicit, not `if (user)`)

1. User signs in with Firebase Auth (email/password) on `/admin/login`.
2. A one-time, manually-run script (`scripts/set-admin-claim.ts`) uses the Admin SDK to set a **custom claim** `{ admin: true }` on that user's UID, after cross-checking the UID against an `admins/{uid}` Firestore allowlist document.
3. Every admin Server Action / Route Handler re-verifies the caller's ID token server-side (`getAuth(adminApp).verifyIdToken(token)`) and checks `decodedToken.admin === true` **and** that `admins/{uid}` exists in Firestore — belt-and-suspenders, two independent checks.
4. `/admin/*` routes are additionally protected by a server-side layout guard (`src/app/admin/layout.tsx`) that reads the session cookie, verifies it, and redirects unauthenticated/non-admin users to `/admin/login` before any admin UI renders.
5. Firestore Security Rules independently enforce that only UIDs present in `admins/{uid}` (or with the custom claim) can write to `projects`, `experience`, `skills`, `about`, `siteSettings`. Public users get read-only access to published content. This means even if the Next.js layer were bypassed, Firestore itself refuses the write.

Session strategy: Firebase session cookie (`createSessionCookie` via Admin SDK) set as an `httpOnly`, `secure` cookie from a `/api/auth/session` Route Handler after client-side sign-in. This lets the server layout check auth without shipping the Firebase client SDK's auth state into a Client Component gate.

---

## 4. Firestore Data Model

Collections (flat, one concern each):

### `siteSettings/main` (single document)
```ts
{
  name: Nur Mohammed Pavel;
  title: Senior software Developer;
  description: string;
  email: pavel@gmail.com;
  socials: { github?: string; linkedin?: string; twitter?: string; other?: { label: string; url: string }[] };
  resumeUrl?: string;
  availability: { status: "available" | "open" | "unavailable"; label: string };
  updatedAt: Timestamp;
}
```

### `about/main` (single document)
```ts
{
  introduction: "Hey ! I am Pavel";        // rich-ish text (markdown or plain paragraphs)
  philosophy: string;
  summary: string;
  stats: { label: string; value: number; suffix?: string }[]; // e.g. "Years Experience", "Projects Shipped"
  updatedAt: Timestamp;
}
```

### `skills/{id}`
```ts
{
  name: string;
  category: "languages"(html, css, js, ts, python, c, c++, php) | "frontend"(react, next, vue) | "backend"(node, express, nest, Django, Laravel) | "database"(Mysql, posrgreSql, MongoDB, firebase) | "tools";
  icon: string;              // icon key resolved via an icon registry, not free-text SVG
  proficiency?: "learning" | "comfortable" | "proficient" | "advanced"; // qualitative, not %
  description?: string;
  order: number;
  enabled: boolean;
}
```

### `projects/{id}`
```ts
{
  title: string;
  slug: string;               // unique, used for /projects/[slug]
  shortDescription: string;
  fullDescription: string;    // markdown
  type: string;                // e.g. "Web App", "Open Source", "SaaS"
  technologies: string[];      // references skills by name (denormalized for display)
  featuredImage: string;       // storage URL
  gallery: string[];
  githubUrl?: string;
  liveUrl?: string;
  startDate: Timestamp;
  endDate?: Timestamp;
  order: number;
  featured: boolean;
  published: boolean;
  caseStudy: {
    problem?: string;
    solution?: string;
    approach?: string;
    challenges?: string;
    results?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `experience/{id}`
```ts
{
  company: string;
  position: string;
  employmentType: "full-time" | "part-time" | "contract" | "freelance" | "internship";
  location: string;
  startDate: Timestamp;
  endDate?: Timestamp;
  isCurrent: boolean;
  description: string;
  responsibilities: string[];
  technologies: string[];
  companyUrl?: string;
  order: number;
}
```

### `admins/{uid}` (allowlist, not user profile data)
```ts
{ email: string; addedAt: Timestamp; addedBy: string; }
```

### `messages/{id}` (contact form submissions — write-only from public, read by admin)
```ts
{ name: string; email: string; subject: string; message: string; createdAt: Timestamp; read: boolean; }
```

Indexes needed (documented in `firestore.indexes.json`): `projects` by `published, order`; `projects` by `published, featured, order`; `skills` by `enabled, category, order`; `experience` by `order`.

---

## 5. Firebase Abstraction Layer (`src/lib/firebase/`)

```
src/lib/firebase/
  client.ts            # initializes Firebase client SDK (browser + RSC-safe public reads)
  admin.ts             # initializes Firebase Admin SDK (server-only, service account)
  auth-client.ts        # client-side sign-in/sign-out helpers (used only on /admin/login)
  session.ts           # server-only: create/verify session cookie, getCurrentAdmin()
  converters.ts         # Firestore <-> TS type converters (withConverter)
  repositories/
    projects-repository.ts
    experience-repository.ts
    skills-repository.ts
    about-repository.ts
    site-settings-repository.ts
    messages-repository.ts
```

Rules for this layer:
- Every repository exposes typed functions only (`getPublishedProjects()`, `getProjectBySlug()`, `createProject(input)`, …). No raw `db.collection(...)` calls outside this folder.
- Write-side repository functions live behind Server Actions (`src/app/admin/**/actions.ts`) that first call `requireAdmin()` from `session.ts`.
- Zod schemas in `src/lib/validation/*.ts` validate all inputs before they reach a repository write function.

---

## 6. Directory Structure (target)

```
portfolio/
  PLAN.md
  README.md
  .env.example
  firestore.rules
  firestore.indexes.json
  next.config.ts
  tsconfig.json
  eslint.config.mjs
  tailwind.config.ts          # (or CSS-first config under app/globals.css for Tailwind v4)
  scripts/
    set-admin-claim.ts
  src/
    app/
      layout.tsx                       # root layout: fonts, ThemeProvider, Navbar, Footer
      page.tsx                         # home = Hero + About + Skills + Projects + Experience + Contact (composed sections)
      globals.css
      sitemap.ts
      robots.ts
      not-found.tsx
      error.tsx
      loading.tsx
      projects/
        [slug]/
          page.tsx
          not-found.tsx
          loading.tsx
      admin/
        layout.tsx                     # server guard: requireAdmin() or redirect
        login/
          page.tsx                     # client form -> session route handler
        page.tsx                       # dashboard overview
        projects/
          page.tsx
          new/page.tsx
          [id]/edit/page.tsx
          actions.ts
        experience/
          page.tsx
          actions.ts
        skills/
          page.tsx
          actions.ts
        about/
          page.tsx
          actions.ts
        settings/
          page.tsx
          actions.ts
      api/
        auth/session/route.ts          # POST: verify idToken -> set session cookie; DELETE: sign out
        contact/route.ts                # POST: validate + rate-limit + write to `messages`
    components/
      ui/                               # generic, content-agnostic primitives
        button.tsx
        badge.tsx
        modal.tsx
        section-heading.tsx
        loading-state.tsx
        empty-state.tsx
        toast.tsx
      motion/                           # animation primitives (section 8 below)
        fade-in.tsx
        reveal.tsx
        stagger.tsx
        animated-text.tsx
        motion-provider.tsx             # reduced-motion context
      layout/
        navbar.tsx
        mobile-nav.tsx
        footer.tsx
        theme-toggle.tsx
      sections/
        hero/hero-section.tsx
        about/about-section.tsx, about-stats.tsx
        skills/skills-section.tsx, skill-category.tsx, skill-card.tsx
        projects/projects-section.tsx, project-card.tsx, project-grid.tsx
        experience/experience-section.tsx, timeline.tsx, experience-item.tsx
        contact/contact-section.tsx, contact-form.tsx
      social-links.tsx
      admin/
        sidebar.tsx
        stat-card.tsx
        data-table.tsx
        confirm-dialog.tsx
        project-form.tsx
        experience-form.tsx
        skill-form.tsx
    lib/
      firebase/…  (see section 5)
      validation/
        project.ts, experience.ts, skill.ts, about.ts, site-settings.ts, contact.ts
      utils/
        cn.ts, dates.ts, seo.ts
      constants/
        nav-items.ts, icon-registry.ts
      types/
        project.ts, experience.ts, skill.ts, about.ts, site-settings.ts
    hooks/
      use-scroll-direction.ts           # navbar show/hide
      use-reduced-motion-safe.ts
      use-toast.ts
  public/
    (favicons, og-image, resume placeholder)
```

---

## 7. Design System

- **Tokens**: CSS variables in `globals.css` (`--color-bg`, `--color-surface`, `--color-border`, `--color-fg`, `--color-fg-muted`, `--color-accent`, radii, shadows) mapped into Tailwind theme (`@theme` in Tailwind v4). Light and dark palettes defined once; `next-themes` (or a minimal custom ThemeProvider) toggles `class="dark"` / respects `prefers-color-scheme`.
- **Typography**: one display/heading font (e.g. a geometric sans via `next/font/google`, e.g. "Geist" or "Space Grotesk") + one body font. Fluid type scale via `clamp()` utilities.
- **Layout**: 12-col responsive grid via Tailwind, generous section vertical rhythm (`py-24 md:py-32`), max content width container.
- **Surfaces**: subtle 1px borders (`--color-border` at low opacity), soft shadows only in light mode, layered background via faint gradients/noise, no heavy card chrome.
- **Editorial touches** (Aayush-inspired): large index numbers on case studies (`01 /`), meta rows (role · year · stack), horizontal rules as section dividers.
- **Personal/clean touches** (Abhay-inspired): hero as big confident type stack, no photo, generous negative space, understated CTA row.

---

## 8. Animation System (Framer Motion)

Centralize variants in `src/components/motion/`:

- `motion-provider.tsx` — reads `prefers-reduced-motion`, exposes a context/hook `useReducedMotion()`; all primitives below consult it and collapse to instant opacity/no-transform when true.
- `fade-in.tsx` — `<FadeIn delay?>` opacity/translateY entrance, viewport-triggered (`whileInView`, `once: true`).
- `reveal.tsx` — thin wrapper around `FadeIn` semantics for section-level scroll reveals (naming matches spec's "Reveal").
- `stagger.tsx` — `<StaggerGroup>` + `<StaggerItem>` using variants + `staggerChildren`, used for hero sequence, nav mobile menu, skill grids.
- `animated-text.tsx` — word/line stagger for headings.
- Navbar show/hide — driven by `use-scroll-direction.ts` hook (direction + near-top threshold), animated via `animate={{ y: hidden ? -100 : 0 }}` with spring transition, not raw scroll listeners in every component.
- Modal / mobile menu — shared `<Modal>` primitive with `AnimatePresence`, focus-trap, `Escape` to close, backdrop fade + panel slide/scale.
- Hover: mostly CSS transitions (transform/opacity) for cheap, always-on affordances (buttons, links, cards); Framer Motion reserved for orchestrated/entrance/exit animation, not simple hovers — keeps client JS lower.

All animations restricted to `transform` and `opacity` (no animating layout-affecting properties) to avoid layout thrashing.

---

## 9. Validation Strategy

- One Zod schema per content type in `src/lib/validation/`, colocated with an inferred TS type exported for reuse (`export type ProjectInput = z.infer<typeof projectSchema>`).
- Contact form: shared schema used both client-side (RHF resolver, inline errors) and server-side (Route Handler re-validates — never trust client validation alone).
- Admin forms: same pattern — RHF + Zod client-side for UX, Server Action re-validates before calling the repository write.

---

## 10. SEO

- `src/app/layout.tsx` root `metadata` (title template, description, `metadataBase`, OG/Twitter defaults) sourced from `siteSettings`.
- `generateMetadata` on `/projects/[slug]` built from project title/shortDescription/featuredImage.
- `sitemap.ts` (dynamic, includes published project slugs) and `robots.ts`.
- JSON-LD `Person`/`WebSite` structured data injected in root layout via a small server component.

---

## 11. Performance

- Default to Server Components; `"use client"` only in: navbar (scroll hook), mobile menu, theme toggle, contact form, admin forms/tables, motion primitives that need `whileInView`/hooks.
- Firestore reads for public content happen in Server Components using the Admin SDK (server-only, trusted) with `fetch`-level or Next `revalidate` tags (`revalidateTag`/`unstable_cache` around repository read functions) — e.g. `revalidate: 300` for projects/skills/experience/about/settings, invalidated on admin write via `revalidatePath`/`revalidateTag`.
- Images via `next/image`, `sizes` set per breakpoint, featured images use `priority` only above the fold.
- No client-side Firestore listeners on the public site (avoids shipping the full client SDK); client SDK bundle limited to `/admin/login` and admin mutation confirmation flows where needed.

---

## 12. Accessibility

- Semantic landmarks (`<header>`, `<nav>`, `<main>`, `<section aria-labelledby>`, `<footer>`).
- Heading hierarchy: one `h1` (hero name), `h2` per section, `h3` within.
- Mobile menu: `role="dialog" aria-modal`, focus trap, returns focus to trigger, `Escape` closes.
- Forms: every input has an associated `<label>`, errors linked via `aria-describedby`, `aria-invalid` on failure.
- Visible focus rings via Tailwind `focus-visible` utilities everywhere interactive.
- `prefers-reduced-motion` collapses entrance animations to simple fades / no transforms (never removes content, only motion).

---

## 13. Execution Phases (build order)

1. **Scaffold** — `create-next-app` (TS, Tailwind, App Router, ESLint), base config, folder skeleton, this PLAN.md committed.
2. **Design system** — tokens, fonts, `globals.css`, `ThemeProvider` + toggle.
3. **Global layout** — root layout, container, Navbar (static first), Footer.
4. **Navbar behavior** — scroll show/hide hook, mobile nav with animation.
5. **Motion primitives** — FadeIn/Reveal/Stagger/AnimatedText + reduced-motion provider.
6. **Hero** — staggered entrance sequence, CTAs, socials (placeholder content constants first, Firestore-wired later where applicable).
7. **About** — layout + stats, wired to `about` repository with sensible fallback content.
8. **Tech Stack** — category grid, skill card + hover, wired to `skills` repository.
9. **Projects** — grid/cards on home, `/projects/[slug]` case-study page, wired to `projects` repository.
10. **Experience** — timeline (desktop) / simplified vertical (mobile), wired to `experience` repository.
11. **Contact** — form (RHF+Zod) + Route Handler writing to `messages`, success/error/loading states.
12. **Firebase integration** — client.ts/admin.ts init, repositories, converters, seed script/documented manual setup.
13. **Authentication** — login page, session Route Handler, `requireAdmin()`, `set-admin-claim.ts` script.
14. **Admin dashboard** — layout guard, sidebar, overview stats.
15. **Admin CRUD** — projects (incl. reorder/publish/feature), experience, skills, about, settings — Server Actions + forms + confirm dialogs + toasts.
16. **Security rules** — `firestore.rules`, `firestore.indexes.json`, manual verification against both public and admin paths.
17. **Accessibility pass** — keyboard walkthrough, landmarks, contrast check.
18. **Performance pass** — caching/revalidation tags, image audit, bundle check (`next build` output).
19. **SEO pass** — metadata, sitemap, robots, structured data, OG image.
20. **Production build verification** — `next build`, `tsc --noEmit`, `eslint .`, manual route smoke test; finalize `README.md`, `.env.example`.

Each phase should leave the app building and runnable — no long-lived broken intermediate states.

---

## 14. Required Root Files (checklist)

- [ ] `README.md` — setup, Firebase project/auth/Firestore creation, env vars, admin user setup, security rules deploy, local dev, production deploy.
- [ ] `.env.example` — all `NEXT_PUBLIC_FIREBASE_*` + server-only `FIREBASE_ADMIN_*` (or `FIREBASE_SERVICE_ACCOUNT_KEY`) + `SESSION_COOKIE_SECRET` if needed, each commented with where to find it in the Firebase console.
- [ ] `firestore.rules`
- [ ] `firestore.indexes.json`
- [ ] `PLAN.md` (this file)

---

## 15. Open Placeholder Content

All personal content ships as obvious placeholders until replaced:
`YOUR_NAME`, `YOUR_TITLE`, `YOUR_EMAIL`, `YOUR_GITHUB`, `YOUR_LINKEDIN`, generic "About" copy explicitly marked `// TODO: replace with real bio`, zeroed/placeholder stats rather than invented numbers, and zero seeded projects/experience beyond structurally-illustrative examples clearly marked as samples in code comments (or simply empty-state UI until the admin adds real entries).

---

## 16. Next Step

Proceed to **Phase 1 (Scaffold)** on confirmation.
