import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { config } from "dotenv";
import { GoogleAuth } from "google-auth-library";

import { fail, style } from "./firebase-admin.mjs";

/**
 * Deploys firestore.rules to the live project using the same service-account
 * credentials the app already uses (FIREBASE_* in .env), via the Firebase
 * Rules REST API directly. Exists because the `firebase` CLI needs an
 * interactive `firebase login`, which this environment can't do.
 *
 *   npm run deploy-rules
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env.local"), quiet: true });
config({ path: resolve(root, ".env"), quiet: true });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  fail("Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env");
}

const rulesPath = resolve(root, "firestore.rules");
const source = readFileSync(rulesPath, "utf8");

const auth = new GoogleAuth({
  credentials: { client_email: clientEmail, private_key: privateKey },
  scopes: ["https://www.googleapis.com/auth/cloud-platform", "https://www.googleapis.com/auth/firebase"],
});

const client = await auth.getClient();

async function api(path, options = {}) {
  const res = await client.request({
    url: `https://firebaserules.googleapis.com/v1/${path}`,
    method: options.method ?? "GET",
    data: options.body,
  });
  return res.data;
}

console.log(`\n${style.bold("Deploying firestore.rules")} ${style.dim(`→ ${projectId}`)}`);

// 1. Upload the rules source as a new, immutable ruleset.
const ruleset = await api(`projects/${projectId}/rulesets`, {
  method: "POST",
  body: { source: { files: [{ name: "firestore.rules", content: source }] } },
});
console.log(`  ${style.green("✔")} ruleset created ${style.dim(ruleset.name)}`);

// 2. Point the cloud.firestore release at it — create the release if this is
//    the project's first deploy, otherwise update the existing one.
const releaseName = `projects/${projectId}/releases/cloud.firestore`;

try {
  await api(`projects/${projectId}/releases/cloud.firestore`, {
    method: "PATCH",
    body: { release: { name: releaseName, rulesetName: ruleset.name } },
  });
  console.log(`  ${style.green("✔")} release updated`);
} catch (error) {
  if (error.response?.status === 404) {
    await api(`projects/${projectId}/releases`, {
      method: "POST",
      body: { release: { name: releaseName, rulesetName: ruleset.name } },
    });
    console.log(`  ${style.green("✔")} release created`);
  } else {
    throw error;
  }
}

console.log(`\n${style.dim("Live now. Verify with: npm run test-firebase")}\n`);
