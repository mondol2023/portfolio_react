import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { config } from "dotenv";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Shared bootstrap for the CLI scripts in this directory.
 *
 * These run under plain Node, outside Next.js, so nothing loads `.env.local`
 * for them — `dotenv` does it here. The app's own `src/lib/firebase/admin.ts`
 * is not reused because it imports `server-only`, which only resolves inside a
 * Next.js build.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Same precedence Next.js uses: `.env.local` wins over `.env`.
config({ path: resolve(root, ".env.local"), quiet: true });
config({ path: resolve(root, ".env"), quiet: true });

/** ANSI helpers — these scripts are interactive, so a little colour earns its keep. */
export const style = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
};

/** Prints the message and exits non-zero, so CI and shell `&&` chains notice. */
export function fail(message) {
  console.error(`\n${style.red("✖")} ${message}\n`);
  process.exit(1);
}

export function readPackageVersion() {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  return pkg.version;
}

/**
 * Initialises the Admin SDK from the service-account environment variables.
 * Exits with a pointed message rather than a stack trace when they are missing —
 * that is by far the most common way these scripts are run wrong.
 */
export function initAdmin() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  const missing = [
    ["FIREBASE_PROJECT_ID", projectId],
    ["FIREBASE_CLIENT_EMAIL", clientEmail],
    ["FIREBASE_PRIVATE_KEY", privateKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    fail(
      `Missing environment variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}\n` +
        `  Copy .env.example to .env.local and fill in the service-account values.\n` +
        `  ${style.dim("Firebase console → Project settings → Service accounts → Generate new private key")}`,
    );
  }

  const app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });

  return { app, db, auth: getAuth(app), projectId };
}
