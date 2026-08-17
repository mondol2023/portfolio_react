/**
 * Firestore seeder.
 *
 *   npm run seed
 *   npm run seed -- --force    # overwrite documents that already exist
 *
 * Credentials, in order of preference:
 *
 *   1. ./serviceAccountKey.json  — drop the console download here and go.
 *   2. .env / .env.local         — FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
 *                                  FIREBASE_PRIVATE_KEY. Already configured on
 *                                  this machine, so nothing extra is needed.
 *
 * Either way the key bypasses firestore.rules completely. Both sources are
 * gitignored; keep it that way.
 *
 * What this does NOT do is invent a career. There is no fabricated employment
 * history, no invented client, no made-up statistic. Site settings carry the
 * owner's real name, title and email; everything the script cannot know is a
 * `YOUR_*` token. The single project and single role are explicitly labelled
 * placeholders — the project stays unpublished so it never reaches a public
 * page, and both are meant to be edited or deleted in /admin.
 *
 * The skill list is the one thing seeded in bulk, because it is a menu of
 * technologies rather than a claim: every entry starts with no proficiency set,
 * and curating it is step one in /admin/skills.
 *
 * If ADMIN_PASSWORD is set in .env this also creates the Firebase Auth account
 * that signs in at /admin/login. Granting that account access is a separate
 * step — `npm run set-admin` — for the reasons in seedAdminUser below.
 *
 * Safe to re-run. Existing documents are skipped unless --force is passed.
 */

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const { cert, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

const force = process.argv.slice(2).includes("--force");

const style = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
};

// --- Connection -------------------------------------------------------------

/**
 * The .env branch reuses scripts/firebase-admin.mjs rather than repeating its
 * dotenv loading and `\n` unescaping. That module is ESM and this file is
 * CommonJS, hence the dynamic import — firebase-admin's ESM build is a thin
 * wrapper over its CommonJS one, so both paths share the same FieldValue.
 */
async function connect() {
  // Imported for its side effect as much as its export: loading the helper runs
  // dotenv, which both branches below need — ADMIN_EMAIL and ADMIN_PASSWORD are
  // read from .env no matter where the service-account credentials come from.
  const helper = path.join(__dirname, "scripts", "firebase-admin.mjs");
  const { initAdmin } = await import(pathToFileURL(helper).href);

  const keyPath = path.join(__dirname, "serviceAccountKey.json");

  if (fs.existsSync(keyPath)) {
    const serviceAccount = require(keyPath);

    // firebase-admin v14 dropped the old `admin.credential` / `admin.firestore()`
    // / `admin.auth()` namespace — these come from the subpath modules now.
    const app = initializeApp({ credential: cert(serviceAccount) });
    const db = getFirestore(app);
    db.settings({ ignoreUndefinedProperties: true });

    return {
      db,
      auth: getAuth(app),
      projectId: serviceAccount.project_id,
      source: "serviceAccountKey.json",
    };
  }

  const { db, auth, projectId } = initAdmin();

  return { db, auth, projectId, source: ".env" };
}

// --- Content ----------------------------------------------------------------

// Mirrors DEFAULT_SITE_SETTINGS in src/lib/constants/defaults.ts. Duplicated
// rather than imported because this script runs under plain Node and that
// module is TypeScript behind a `@/` path alias.
const siteSettings = {
  name: "Nur Mohammed Pavel",
  title: "Senior Software Developer",
  tagline: "I design and build web products that stay maintainable after launch.",
  description:
    "Senior software developer focused on TypeScript, React and Next.js — building fast, accessible, well-architected web applications from first commit to production.",
  email: "pavel@gmail.com",
  location: "YOUR_LOCATION",
  github: "https://github.com/mondol2023",
  linkedin: "https://linkedin.com/in/YOUR_LINKEDIN",
  otherSocials: [],
  availabilityStatus: "available",
  availabilityLabel: "Available for new work",
};

const about = {
  introduction:
    "I'm a software developer who cares about the part of the job that happens after the demo — the code someone else has to read, extend and debug six months later.",
  philosophy:
    "Good software is mostly good decisions made cheaply reversible. I favour boring, explicit architecture over clever abstractions, strong typing at the boundaries, and interfaces that stay usable with a keyboard and a screen reader.",
  summary:
    "Most of my work sits between product and platform: shipping user-facing features while keeping the underlying system coherent — design systems, data modelling, performance budgets and the deployment pipeline that ties them together.",
  // Empty on purpose. Statistics are a personal claim, so they start unset and
  // are filled in by the owner at /admin/about.
  stats: [],
};

/** Starter technology list. No proficiency is asserted — that is the owner's call. */
const skills = [
  ["TypeScript", "languages"],
  ["JavaScript", "languages"],
  ["HTML", "languages"],
  ["CSS", "languages"],
  ["SQL", "languages"],
  ["React", "frontend"],
  ["Next.js", "frontend"],
  ["Tailwind CSS", "frontend"],
  ["Framer Motion", "frontend"],
  ["Node.js", "backend"],
  ["REST APIs", "backend"],
  ["Server Actions", "backend"],
  ["Firestore", "database"],
  ["PostgreSQL", "database"],
  ["Redis", "database"],
  ["Git", "tools"],
  ["Docker", "tools"],
  ["Vercel", "tools"],
  ["Firebase", "tools"],
  ["Figma", "tools"],
].map(([name, category], index) => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  data: { name, category, order: index, enabled: true },
}));

const placeholderProject = {
  title: "YOUR_PROJECT_TITLE",
  slug: "example-project",
  shortDescription:
    "PLACEHOLDER — one or two sentences describing what this project is and who it is for. Replace this in /admin/projects.",
  fullDescription:
    "PLACEHOLDER — the longer description shown on the project detail page. Cover what the project does, the scope of your involvement and anything a reader would want to know before clicking through to the code or the live site. Replace or delete this entry in /admin/projects.",
  type: "Web App",
  technologies: ["Next.js", "TypeScript", "Tailwind CSS"],
  gallery: [],
  startDate: "2024-01-01",
  order: 0,
  featured: false,
  // Unpublished, so this placeholder never appears on a public page. Publish it
  // only once the content is genuinely yours.
  published: false,
  caseStudy: {
    problem: "PLACEHOLDER — what problem did this solve, and for whom?",
    solution: "PLACEHOLDER — what did you build, and why that shape?",
    approach: "PLACEHOLDER — the architecture, and the trade-offs behind it.",
    challenges: "PLACEHOLDER — what was genuinely hard, and how you handled it.",
    results: "PLACEHOLDER — measurable outcomes only. Delete this field if you have none.",
  },
};

const placeholderExperience = {
  company: "YOUR_COMPANY",
  position: "YOUR_ROLE",
  employmentType: "full-time",
  location: "YOUR_LOCATION",
  startDate: "2024-01-01",
  isCurrent: true,
  description:
    "PLACEHOLDER — replace this entry with a real role, or delete it in /admin/experience. It is seeded only so the timeline has something to render on a fresh install.",
  responsibilities: ["PLACEHOLDER — a responsibility or outcome, in your own words."],
  technologies: ["TypeScript", "React"],
  order: 0,
};

/** Every document this script writes, in the order it reports them. */
const documents = [
  { group: "Content", collection: "content", id: "siteSettings", data: siteSettings },
  { group: "Content", collection: "content", id: "about", data: about },
  ...skills.map((skill) => ({
    group: "Skills",
    collection: "skills",
    id: skill.id,
    data: skill.data,
  })),
  {
    group: "Placeholders",
    collection: "projects",
    id: "example-project",
    data: placeholderProject,
    timestamps: true,
  },
  {
    group: "Placeholders",
    collection: "experience",
    id: "example-role",
    data: placeholderExperience,
  },
];

// --- Administrator account ---------------------------------------------------

/**
 * Creates the Firebase Auth account that signs in at /admin/login.
 *
 * Opt-in: it runs only when ADMIN_PASSWORD is set in .env, because a password
 * hardcoded into a committed script is a password that leaks. An account that
 * already exists is left alone unless --force is passed, so re-seeding never
 * silently resets a password you have since changed.
 *
 * This creates the *account*. It deliberately does not grant it anything —
 * admin access is the custom claim plus the `admins/{uid}` document, and both
 * are maintained by `npm run set-admin`, which can also revoke. Duplicating
 * that here would give the project two places to get authorisation wrong.
 */
async function seedAdminUser(auth) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  console.log(`\n${style.bold("Administrator")}`);

  if (!email || !password) {
    console.log(
      `  ${style.dim("skip  set ADMIN_EMAIL and ADMIN_PASSWORD in .env to create the sign-in account")}`,
    );
    return;
  }

  // Firebase enforces this too, but reports it less legibly than a plain line.
  if (password.length < 6) {
    console.log(`  ${style.yellow("skip")}  ADMIN_PASSWORD must be at least 6 characters`);
    return;
  }

  const existing = await auth.getUserByEmail(email).catch((error) => {
    if (error.code === "auth/user-not-found") return null;
    throw error;
  });

  if (!existing) {
    const user = await auth.createUser({ email, password, emailVerified: true });
    console.log(`  ${style.green("write")} ${email}  ${style.dim(user.uid)}`);
  } else if (force) {
    await auth.updateUser(existing.uid, { password });
    console.log(`  ${style.green("reset")} password for ${email}  ${style.dim(existing.uid)}`);
  } else {
    console.log(`  ${style.dim(`skip  ${email} (already exists)`)}`);
  }

  console.log(`  ${style.dim("Then run `npm run set-admin` — creating the account grants it nothing.")}`);
}

// --- Writing ----------------------------------------------------------------

async function seedData() {
  const { db, auth, projectId, source } = await connect();

  console.log(`\n${style.bold("Seeding Firestore")}  ${style.dim(`${projectId} · via ${source}`)}`);
  if (force) console.log(style.yellow("  --force: existing documents will be overwritten"));

  const refs = documents.map((doc) => db.collection(doc.collection).doc(doc.id));

  // One read pass up front, so the skip decision costs 1 round trip rather than
  // one per document. getAll preserves input order.
  const snapshots = await db.getAll(...refs);

  const batch = db.batch();
  let written = 0;
  let skipped = 0;
  let group = null;

  documents.forEach((doc, index) => {
    if (doc.group !== group) {
      group = doc.group;
      console.log(`\n${style.bold(group)}`);
    }

    const existing = snapshots[index];

    if (existing.exists && !force) {
      skipped += 1;
      console.log(`  ${style.dim(`skip  ${doc.collection}/${doc.id} (already exists)`)}`);
      return;
    }

    batch.set(
      refs[index],
      doc.timestamps
        ? {
            ...doc.data,
            createdAt: existing.get("createdAt") ?? FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          }
        : doc.data,
    );

    written += 1;
    console.log(`  ${style.green("write")} ${doc.collection}/${doc.id}`);
  });

  // An empty batch still costs a round trip, and commits nothing useful.
  if (written > 0) await batch.commit();

  await seedAdminUser(auth);

  console.log(
    `\n${style.green("✔")} Done — ${written} written, ${skipped} skipped.` +
      (skipped > 0 && !force ? `  ${style.dim("Re-run with --force to overwrite.")}` : ""),
  );
  console.log(
    `\n${style.yellow("Next:")} sign in at /admin and replace every ${style.bold("YOUR_*")} and ${style.bold("PLACEHOLDER")} value.\n`,
  );

  process.exit(0);
}

seedData().catch((error) => {
  console.error(`\n${style.red("✖")} Seeding failed: ${error.message}`);

  // The two failures a fresh project actually hits, both fixed in the console
  // rather than in this file.
  if (/has not been used in project|SERVICE_DISABLED/.test(error.message)) {
    console.error(
      style.dim("  Firestore is not enabled yet — Firebase console → Firestore Database → Create database.\n"),
    );
  } else if (/configuration-not-found/.test(error.message)) {
    console.error(
      style.dim("  Authentication is not enabled yet — Firebase console → Authentication → Get started → Email/Password.\n"),
    );
  } else if (/Missing environment variable|invalid_grant|DECODER/.test(error.message)) {
    console.error(
      style.dim("  Credentials rejected — check FIREBASE_PRIVATE_KEY in .env, or drop serviceAccountKey.json in the project root.\n"),
    );
  } else {
    console.error("");
  }

  process.exit(1);
});
