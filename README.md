# Portfolio + CMS

A developer portfolio with a Firebase-backed admin CMS, built entirely inside
**Next.js 16**. There is no separate backend service — every read, write and
authorization check happens in Server Components and Server Actions.

The public site renders from Firestore on the server. The `/admin` area is a real
content management system: dashboard, CRUD for projects, experience and skills,
draft/publish, reordering, an inbox for contact-form submissions, and editors for
the About section and site settings.

> **Before you publish:** the seeded content contains `YOUR_*` and `PLACEHOLDER`
> tokens. They are deliberate — nothing in this repository invents an employment
> history, a client or a statistic on your behalf. Replace them in `/admin`.

---

## Contents

- [Stack](#stack)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Firebase setup](#firebase-setup)
  - [1. Create the project](#1-create-the-project)
  - [2. Enable Authentication](#2-enable-authentication)
  - [3. Create the Firestore database](#3-create-the-firestore-database)
  - [4. Collect the credentials](#4-collect-the-credentials)
- [Environment variables](#environment-variables)
- [Demo content](#demo-content)
- [Create your admin user](#create-your-admin-user)
- [Seed the content](#seed-the-content)
- [Security rules and indexes](#security-rules-and-indexes)
- [Local development](#local-development)
- [How authorization works](#how-authorization-works)
- [Project structure](#project-structure)
- [Routes](#routes)
- [Data model](#data-model)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React Server Components) |
| Language | TypeScript, `strict` + `noUncheckedIndexedAccess` |
| Styling | Tailwind CSS v4 (CSS-first config, no `tailwind.config.ts`) |
| Animation | Motion (`motion/react`), gated on `prefers-reduced-motion` |
| Data | Cloud Firestore via the Firebase Admin SDK (server only) |
| Auth | Firebase Authentication + httpOnly session cookies |
| Forms | React Hook Form + Zod v4 |
| Theming | `next-themes`, three-state light / dark / system |
| Icons | lucide-react |

Client-side JavaScript is kept deliberately small: the Firebase **browser** SDK is
loaded on exactly one route (`/admin/login`) and only to exchange an email and
password for an ID token. No Firestore access happens in the browser.

## Requirements

- **Node.js 20.9+** (Next.js 16 minimum)
- **npm 10+**
- A Google account, for the free Firebase Spark plan
- Optional: the [Firebase CLI](https://firebase.google.com/docs/cli) — needed only
  to deploy security rules and indexes from the command line

## Quick start

```bash
npm install
cp .env.example .env.local     # then fill it in — see "Environment variables"
npm run set-admin -- you@example.com
npm run seed
npm run dev
```

Open <http://localhost:3000> for the site and <http://localhost:3000/admin> for
the CMS.

The app runs without Firebase configured — every page renders its empty state and
the build stays green — so you can look around first. Nothing is editable until
the environment variables are set.

---

## Firebase setup

### 1. Create the project

1. Go to the [Firebase console](https://console.firebase.google.com/) and click
   **Add project**.
2. Name it, and turn Google Analytics off unless you want it. It is not used here.
3. Once the project is ready, click the **web** icon (`</>`) on the project
   overview to register a web app. Give it any nickname; do **not** enable Firebase
   Hosting (this app deploys to a Node host, not static hosting).
4. Firebase shows you a `firebaseConfig` object. Keep the tab open — those values
   are the `NEXT_PUBLIC_FIREBASE_*` variables.

### 2. Enable Authentication

1. **Build → Authentication → Get started.**
2. On the **Sign-in method** tab, enable **Email/Password**. Leave "Email link
   (passwordless sign-in)" off.
3. On the **Users** tab, click **Add user** and create the account you will sign in
   with. This account is not an administrator yet — see
   [Create your admin user](#create-your-admin-user).

Only accounts you create by hand can exist: the app has no public sign-up screen,
and none should be added. Consider disabling self-service sign-up under
**Authentication → Settings → User actions** for defence in depth.

### 3. Create the Firestore database

1. **Build → Firestore Database → Create database.**
2. Choose a location close to your users. This cannot be changed later.
3. Start in **production mode** (locked down). The rules in
   [`firestore.rules`](./firestore.rules) replace the defaults in a moment.

You do not need to create any collections by hand — `npm run seed` does that.

### 4. Collect the credentials

You need two separate sets, and the difference matters:

**Public config** — **Project settings → General → Your apps → SDK setup and
configuration → Config.** These are shipped to the browser. They identify the
project; they authorise nothing.

**Service-account key** — **Project settings → Service accounts → Generate new
private key.** This downloads a JSON file containing `project_id`, `client_email`
and `private_key`. **These credentials bypass Firestore security rules entirely.**
Treat the file like a password: do not commit it, do not paste it into a client
component, and never give any of its values a `NEXT_PUBLIC_` prefix.

---

## Environment variables

Copy [`.env.example`](./.env.example) to `.env.local` and fill it in. `.env.local`
is gitignored; `.env.example` is the committed template and contains no secrets.

### Administrator

| Variable | Required | Notes |
| --- | --- | --- |
| `ADMIN_EMAIL` | no | The account that owns the CMS. Only the default address for `npm run set-admin`, so that command can be run with no argument. Grants nothing by itself — nothing reads it at runtime. |

### Public — safe to expose

Inlined into the browser bundle by Next.js. That is what `NEXT_PUBLIC_` means.

| Variable | Required | Source |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | yes | web app config → `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | yes | web app config → `authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | yes | web app config → `projectId` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | no | web app config → `storageBucket` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | no | web app config → `messagingSenderId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | no | web app config → `appId` |

A Firebase web API key is not a secret. It cannot read or write anything on its
own — [security rules](./firestore.rules) and the server-side admin check are what
enforce access.

### Private — server only, never `NEXT_PUBLIC_`

| Variable | Required | Source |
| --- | --- | --- |
| `FIREBASE_PROJECT_ID` | yes | service-account JSON → `project_id` |
| `FIREBASE_CLIENT_EMAIL` | yes | service-account JSON → `client_email` |
| `FIREBASE_PRIVATE_KEY` | yes | service-account JSON → `private_key` |

`FIREBASE_PRIVATE_KEY` must keep its literal `\n` escape sequences and stay on one
line wrapped in double quotes:

```dotenv
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADAN...\n-----END PRIVATE KEY-----\n"
```

The app unescapes them at runtime. Getting this wrong is the single most common
setup failure — see [Troubleshooting](#troubleshooting).

These three are read only in [`src/lib/firebase/admin.ts`](./src/lib/firebase/admin.ts),
which begins with `import "server-only"`. If any client component ever reaches
them, the **build fails** rather than shipping the key.

### Site

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | production | Canonical origin, no trailing slash. Used for metadata, Open Graph, `robots.txt` and `sitemap.xml`. Defaults to `http://localhost:3000` in development and to `VERCEL_PROJECT_PRODUCTION_URL` on Vercel. |
| `PORTFOLIO_DEMO_CONTENT` | no | Set to `off` to disable the demo content described below. Any other value leaves it on. |
| `ANALYTICS_SALT` | no | Salt for the per-day hash that rate-limits `/api/track`. The hash never leaves the request and no IP address is stored, so this only makes the flood guard harder to game. A shared default is used when unset. |

---

## Demo content

Before Firebase is configured — and after it is, until you have added anything —
the public site renders sample content from
[`src/lib/constants/demo-content.ts`](./src/lib/constants/demo-content.ts):

| Section | Fallback | Replaced by |
| --- | --- | --- |
| Projects (home, `/projects`, case studies) | 4 sample case studies | the first **published** project |
| Experience | 4 sample roles | the first role in `/admin/experience` |
| Tech stack | 20 technologies across all 5 categories | the first enabled skill |
| About statistics | 4 sample figures | the first stat saved in `/admin/about` |

Each fallback is independent: adding one real project removes the sample projects
and leaves the sample roles alone until you add a role.

This is a display fallback, not seed data. Nothing here is ever written to
Firestore, and none of it is presented as fact:

- every affected section carries a **“Sample data”** badge next to its heading
- the companies and products are invented names, and the sample About figures say
  so in their own captions
- the admin lists never show it — `/admin/projects`, `/admin/skills` and
  `/admin/experience` read the store directly, so they only list rows you can
  actually edit
- demo case studies are `noindex` and excluded from `sitemap.xml`

Set `PORTFOLIO_DEMO_CONTENT=off` in `.env.local` to render the real empty states
instead.

---

## Create your admin user

Being signed in is **not** the same as being an administrator. Access requires two
independent facts, and this script sets both:

```bash
npm run set-admin -- you@example.com   # or just `npm run set-admin` with ADMIN_EMAIL set
```

1. It sets the custom claim `admin: true` on the Firebase Auth token. Claims can
   only be written with service-account credentials, never from a browser, and
   this is what [`firestore.rules`](./firestore.rules) checks.
2. It creates an allowlist document at `admins/{uid}`, which is what lets you
   revoke access instantly instead of waiting for a token to expire.

The account must already exist in **Authentication → Users**. If you were already
signed in, sign out and back in so the new claim lands on your token.

To revoke:

```bash
npm run set-admin -- someone@example.com --revoke
```

This clears the claim, deletes the allowlist document and revokes refresh tokens.
Because sessions are verified with `checkRevoked: true`, existing sessions die on
their next request.

## Seed the content

```bash
npm run seed              # skips anything that already exists
npm run seed -- --force   # overwrite
```

This writes `content/siteSettings`, `content/about`, a starter list of skills with
**no proficiency asserted**, one **unpublished** placeholder project and one
placeholder experience entry. The placeholders exist so the admin lists are not
empty on a fresh install; the project is unpublished so it can never reach a public
page before you have rewritten it.

Then sign in at `/admin` and replace every `YOUR_*` and `PLACEHOLDER` value. Start
with **Settings** (name, title, email, GitHub, LinkedIn, location).

## Security rules and indexes

[`firestore.rules`](./firestore.rules) and
[`firestore.indexes.json`](./firestore.indexes.json) are committed at the repository
root and **must be deployed** — the console defaults do not match them.

With the Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use --add                                  # pick your project
firebase deploy --only firestore:rules,firestore:indexes
```

Or paste the contents of `firestore.rules` into **Firestore Database → Rules** in
the console and click **Publish**.

The rules deny everything by default. Published projects, enabled skills,
experience and the content singletons are world-readable; **all** writes require a
verified administrator; the contact-message collection and the admin allowlist are
not publicly readable at all.

Because the application talks to Firestore through the Admin SDK — which bypasses
rules by design — these rules are not load-bearing for normal operation. That is
the point. They are the independent floor that a direct REST or browser client
hits, enforced by Firestore itself rather than by application code that a refactor
could weaken.

---

## Local development

```bash
npm run dev         # dev server at http://localhost:3000
npm run build       # production build
npm start           # serve the production build
npm run lint        # eslint .
npm run typecheck   # next typegen && tsc --noEmit
```

Next.js 16 removed `next lint`, and `next build` no longer lints — run
`npm run lint` yourself or in CI.

`npm run typecheck` runs `next typegen` first to regenerate the route types in
`.next/types` that the typed `PageProps` / `LayoutProps` helpers depend on.

## How authorization works

The specification for this project called for admin access to be protected at more
than one layer, and never on the client alone. There are three, and each holds if
the others are removed.

**1. The routing boundary.**
[`src/app/admin/(dashboard)/layout.tsx`](./src/app/admin/%28dashboard%29/layout.tsx)
calls `getCurrentAdmin()` and redirects to `/admin/login` before any dashboard
markup is generated. Nothing privileged is rendered and then hidden with CSS —
unauthorised requests never receive the HTML at all.

**2. Every mutating Server Action.** A Server Action is a public HTTP endpoint. It
inherits no authority from the layout that happened to render the form, so each one
is wrapped in `withAdmin()`, which re-runs `requireAdmin()` on the server for that
specific request.

**3. Firestore security rules.** The backstop described above.

The admin check itself is two-factor — the `admin: true` custom claim **and** an
`admins/{uid}` document — so `if (user)` is never sufficient anywhere in the
codebase. The session is a Firebase session cookie: `httpOnly`, `sameSite=lax`,
`secure` in production, and verified with `checkRevoked: true` on every request.
Client-side JavaScript can neither read it nor forge one.

Public visitors see no trace of the CMS. `/admin` is absent from the site
navigation and from `sitemap.xml`, disallowed in `robots.txt`, and no admin control
is rendered into any public page — the public and admin route trees do not share a
layout.

## Project structure

```
src/
  app/
    (site)/                  public portfolio shell
      page.tsx               home — all sections
      projects/              index + /projects/[slug] case studies
    admin/
      login/                 the only route using the Firebase browser SDK
      (dashboard)/           guarded CMS: layout.tsx does the redirect
    layout.tsx               root layout, fonts, theme provider
    robots.ts, sitemap.ts, opengraph-image.tsx
  components/
    sections/                one component per public section
    admin/                   CMS forms, tables and controls
    motion/                  reusable animation primitives
    ui/                      buttons, fields, dialogs, toasts
    theme/                   theme provider and toggle
  lib/
    firebase/
      admin.ts               Admin SDK bootstrap (server-only)
      client.ts              browser SDK — sign-in only
      session.ts             session cookies + the admin check
      collections.ts         collection and document paths
      converters.ts          Firestore document → domain model
      repositories/          one module per collection
    actions/                 Server Actions, each wrapped in withAdmin()
    validation/              Zod schemas, independent of any UI
    types/                   domain models
    hooks/  utils/  constants/
scripts/
  firebase-admin.mjs         shared CLI bootstrap (dotenv + credentials)
  set-admin-claim.mjs        grant / revoke admin access
seed.js                      starter content — `npm run seed`
firestore.rules              security rules — deploy these
firestore.indexes.json       composite indexes — deploy these
```

Repositories follow one rule consistently: **reads never throw** (a missing config
or a transient failure degrades to an empty list, so the page shows its empty state
instead of a 500) and **writes always throw** (a silently failed save is a bug the
admin cannot see). Reads are wrapped in React `cache()` so a page and its
`generateMetadata` share a single query per request.

## Routes

**Public**

| Route | Description |
| --- | --- |
| `/` | Hero, About, Tech stack, Projects, Experience, Contact |
| `/projects` | All published projects |
| `/projects/[slug]` | Case study: problem, solution, architecture, challenges, results |
| `/robots.txt`, `/sitemap.xml` | Generated; `/admin` is excluded from both |

**Admin** — all require an authenticated administrator

| Route | Description |
| --- | --- |
| `/admin/login` | Email + password sign-in |
| `/admin` | Dashboard: counts, recent projects, unread messages |
| `/admin/projects` | List, reorder, publish/unpublish, feature, delete |
| `/admin/projects/new`, `/admin/projects/[id]/edit` | Full project + case-study editor |
| `/admin/experience` (+ `new`, `[id]/edit`) | Timeline entries, reorder, current-role flag |
| `/admin/skills` (+ `new`, `[id]/edit`) | Grouped by category, reorder, enable/disable |
| `/admin/about` | Intro, philosophy, summary, key statistics |
| `/admin/settings` | Name, title, tagline, contact details, social links, availability |
| `/admin/messages` | Contact-form inbox: read/unread, reply, delete |

## Data model

| Collection | Shape |
| --- | --- |
| `projects/{id}` | title, slug, descriptions, type, technologies, images, links, dates, `order`, `featured`, `published`, nested `caseStudy` |
| `experience/{id}` | company, position, employmentType, location, dates, `isCurrent`, description, responsibilities, technologies, `order` |
| `skills/{id}` | name, category, optional icon and proficiency, `order`, `enabled` |
| `content/about` | introduction, philosophy, summary, stats |
| `content/siteSettings` | name, title, tagline, description, email, location, social links, availability |
| `messages/{id}` | name, email, subject, message, createdAt, read |
| `admins/{uid}` | allowlist entry — email, name, grantedAt, lastLoginAt |

Skills use qualitative proficiency levels, not percentages: a "73% at React" bar
tells a reader nothing.

Dates are ISO strings (`YYYY-MM-DD`) throughout the application. Firestore
`Timestamp` conversion is confined to the repository layer, so nothing above it has
to know Firestore exists.

## Deployment

The app needs a Node.js runtime. It is not statically exportable — Server Actions,
cookies and server-side Firestore reads all require a server.

### Vercel

1. Push the repository to GitHub and import it at
   [vercel.com/new](https://vercel.com/new). The framework is detected
   automatically; no build settings need changing.
2. Under **Settings → Environment Variables**, add every variable from
   `.env.example` for the **Production** (and, if you use them, Preview and
   Development) environments.
   - Paste `FIREBASE_PRIVATE_KEY` including the `\n` sequences and the surrounding
     quotes, exactly as in `.env.local`.
   - `NEXT_PUBLIC_SITE_URL` is optional on Vercel — it falls back to
     `VERCEL_PROJECT_PRODUCTION_URL` — but set it once you have a custom domain.
3. Deploy.
4. Add your production domain to **Firebase console → Authentication → Settings →
   Authorized domains**, or sign-in will be rejected there.
5. Deploy the rules and indexes if you have not already:
   `firebase deploy --only firestore:rules,firestore:indexes`.

### Any other Node host

```bash
npm ci
npm run build
npm start          # defaults to port 3000; honours $PORT
```

Set the same environment variables in the host's configuration, put the app behind
HTTPS (session cookies are issued with `secure` in production), and add the domain
to Firebase's authorized domains.

### Production checklist

- [ ] `npm run lint`, `npm run typecheck` and `npm run build` all pass
- [ ] Every environment variable set on the host; no secret carries a `NEXT_PUBLIC_` prefix
- [ ] `firestore.rules` deployed — confirm in the console that the rules match the file
- [ ] `firestore.indexes.json` deployed
- [ ] Production domain added to Firebase authorized domains
- [ ] `NEXT_PUBLIC_SITE_URL` set to the real origin
- [ ] Admin claim granted, and sign-in verified on production
- [ ] Every `YOUR_*` and `PLACEHOLDER` value replaced in `/admin`
- [ ] Placeholder project deleted or rewritten and published
- [ ] Service-account JSON not committed anywhere

## Troubleshooting

**Pages render but every section is empty.**
Firebase is not configured. Check the dev server output for the
`[firebase] Admin SDK is not configured` warning and confirm `.env.local` exists.
Next.js only reads env files at startup — restart `npm run dev` after editing one.

**`error:1E08010C:DECODER routines::unsupported` or `Failed to parse private key`.**
`FIREBASE_PRIVATE_KEY` is malformed. It must be on a single line, wrapped in double
quotes, with `\n` written as two characters (backslash + n) rather than as real
newlines.

**"This account is not authorized for admin access" on sign-in.**
The password was correct but the account is not an administrator. Run
`npm run set-admin -- you@example.com`, then sign out and back in so the new claim
is on your token.

**Sign-in fails with `auth/unauthorized-domain`.**
Add the domain under **Firebase console → Authentication → Settings → Authorized
domains**.

**A Firestore query logs "The query requires an index".**
Deploy `firestore.indexes.json`, or follow the link in the error message to create
the index in the console.

**Writes fail with `PERMISSION_DENIED` from a script.**
The scripts use the service-account credentials, which bypass rules — so this means
the credentials themselves are wrong or the service account was deleted. Generate a
fresh private key.

**Admin pages redirect to `/admin/login` in a loop.**
The session cookie is not surviving. In production this usually means the site is
not served over HTTPS; the cookie is issued with `secure` and the browser drops it.
