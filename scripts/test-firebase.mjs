import { initializeApp as initClientApp } from "firebase/app";
import {
  collection,
  getDocs,
  getFirestore as getClientFirestore,
  query,
  where,
} from "firebase/firestore";

import { initAdmin, style } from "./firebase-admin.mjs";

/**
 * Connectivity and permissions check for the Firebase project.
 *
 *   npm run test-firebase           # counts and document ids
 *   npm run test-firebase -- --data # plus the full contents of every document
 *
 * Two passes, because the app talks to Firestore two different ways and they
 * can disagree — which is exactly the situation worth catching:
 *
 *   1. the Admin SDK, using the service-account credentials. This is the path
 *      every page and Server Action actually takes, and it bypasses
 *      firestore.rules entirely. If this pass is empty, the data is not there.
 *
 *   2. the browser SDK, signed in as nobody. This is the path a visitor's
 *      devtools would take, so it proves the NEXT_PUBLIC_ config is valid and
 *      measures what firestore.rules really allows a stranger to read. A denial
 *      here is a pass, not a failure, when the rules are meant to deny.
 *
 * Reads only. Nothing in this script writes.
 */

const showData = process.argv.includes("--data");

/**
 * What each pass expects to see.
 *
 * `filter` exists because Firestore evaluates a rule against the *query*, not
 * the documents it returns: `projects` is readable only where `published ==
 * true`, so an unfiltered listing is rejected outright rather than silently
 * trimmed. The filter is how a browser has to ask, and mirrors the condition in
 * firestore.rules.
 */
const COLLECTIONS = [
  { name: "projects", filter: ["published", "==", true], publicRead: true },
  { name: "experience", filter: null, publicRead: true },
  { name: "skills", filter: ["enabled", "==", true], publicRead: true },
  { name: "content", filter: null, publicRead: true },
  { name: "messages", filter: null, publicRead: false },
  { name: "admins", filter: null, publicRead: false },
];

function preview(data) {
  if (showData) return JSON.stringify(data, null, 2).replace(/^/gm, "      ");

  // One line per document: enough to recognise a row without burying the counts.
  const label = data.title ?? data.position ?? data.name ?? data.subject ?? data.email;
  return label ? `      ${style.dim(String(label))}` : null;
}

/** Flags the paste damage that env files invite: kept quotes, a trailing comma. */
function checkEnvHygiene() {
  const suspect = Object.entries(process.env)
    .filter(([key]) => key.startsWith("NEXT_PUBLIC_FIREBASE_") || key.startsWith("FIREBASE_"))
    .filter(([key, value]) => {
      if (!value) return false;
      // FIREBASE_PRIVATE_KEY is legitimately quoted in .env; dotenv strips those.
      if (key === "FIREBASE_PRIVATE_KEY") return false;
      return /^["']|["'],?$|,$/.test(value.trim());
    })
    .map(([key]) => key);

  if (suspect.length > 0) {
    console.log(`\n${style.yellow("!")} ${style.bold("Suspicious values in .env")}`);
    for (const key of suspect) {
      console.log(`    ${key} ${style.dim("— has surrounding quotes or a trailing comma")}`);
    }
    console.log(
      `  ${style.dim("Env files take bare values. Copying a line out of the console's JS config keeps punctuation that becomes part of the value.")}`,
    );
  }
}

// --- Pass 1: Admin SDK ------------------------------------------------------

const { db, projectId } = initAdmin();

console.log(`\n${style.bold("Firebase check")}  ${style.dim(projectId)}`);
checkEnvHygiene();

console.log(`\n${style.bold("Admin SDK")} ${style.dim("— the path the app uses; ignores security rules")}`);

let totalDocs = 0;

for (const { name } of COLLECTIONS) {
  try {
    const snapshot = await db.collection(name).get();
    totalDocs += snapshot.size;

    const count = snapshot.size === 1 ? "1 document" : `${snapshot.size} documents`;
    console.log(`  ${style.green("✔")} ${name.padEnd(11)} ${count}`);

    for (const document of snapshot.docs) {
      console.log(`      ${style.dim(document.id)}`);
      const body = preview(document.data());
      if (body) console.log(body);
    }
  } catch (error) {
    console.log(`  ${style.red("✖")} ${name.padEnd(11)} ${error.message}`);
  }
}

// --- Pass 2: browser SDK, unauthenticated -----------------------------------

const publicConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

if (!publicConfig.apiKey || !publicConfig.authDomain || !publicConfig.projectId) {
  console.log(
    `\n${style.yellow("!")} ${style.bold("Browser SDK")} skipped — NEXT_PUBLIC_FIREBASE_* is incomplete.` +
      `\n  ${style.dim("Firebase console → Project settings → General → Your apps → Web app → Config.")}`,
  );
} else {
  console.log(
    `\n${style.bold("Browser SDK")} ${style.dim("— signed in as nobody; this is firestore.rules talking")}`,
  );

  const clientDb = getClientFirestore(initClientApp(publicConfig, "rules-check"));

  for (const { name, filter, publicRead } of COLLECTIONS) {
    const ref = collection(clientDb, name);
    const request = filter ? query(ref, where(...filter)) : ref;
    const asked = filter ? `${name} where ${filter[0]} == ${filter[2]}` : name;

    try {
      const snapshot = await getDocs(request);

      // Readable when the rules meant to deny is the finding worth shouting about.
      const mark = publicRead ? style.green("✔") : style.red("✖ EXPOSED");
      console.log(`  ${mark} ${asked} ${style.dim(`→ ${snapshot.size} readable`)}`);
    } catch (error) {
      const denied = error.code === "permission-denied";
      const mark = denied && !publicRead ? `${style.green("✔")} denied` : style.red("✖");
      console.log(`  ${mark} ${asked} ${style.dim(`→ ${denied ? "permission-denied" : error.message}`)}`);
    }
  }
}

console.log(
  `\n${totalDocs === 0 ? style.yellow("No documents found — run `npm run seed`.") : style.dim(`${totalDocs} documents total.`)}\n`,
);

process.exit(0);
