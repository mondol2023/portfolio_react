import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK bootstrap — server only.
 *
 * The service-account credentials here are privileged: they bypass Firestore
 * security rules entirely. They must never be imported from a Client
 * Component, which is what the `server-only` import above enforces at build
 * time.
 *
 * Initialisation is deliberately lazy and failure-tolerant: a fresh clone with
 * no `.env.local` should still typecheck, build and render (with demo or empty
 * states) rather than crash. The same holds for a *half*-configured clone — env
 * vars present but the private key still the `.env.example` placeholder — which
 * is the state a repo sits in between "copied the file" and "pasted the key".
 * `isAdminConfigured()` lets callers tell "no usable credentials" apart from
 * "credentials work but the query failed".
 */

interface AdminServices {
  app: App;
  db: Firestore;
  auth: Auth;
}

const APP_NAME = "portfolio-admin";

let cached: AdminServices | null = null;
let warned = false;
/** Set once the SDK has rejected these credentials, so the failure is not retried per request. */
let initFailed = false;

function readCredentials() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Private keys are stored single-line with escaped newlines in most hosting
  // dashboards, so unescape them before handing them to `cert()`.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

/** True only when the credentials are present *and* the SDK accepted them. */
export function isAdminConfigured(): boolean {
  return getAdminServices() !== null;
}

function getAdminServices(): AdminServices | null {
  if (cached) return cached;
  if (initFailed) return null;

  const credentials = readCredentials();
  if (!credentials) {
    if (!warned && process.env.NODE_ENV !== "production") {
      warned = true;
      console.warn(
        "[firebase] Admin SDK is not configured — FIREBASE_PROJECT_ID / " +
          "FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY are missing. " +
          "Content falls back to empty states. See .env.example.",
      );
    }
    return null;
  }

  const existing = getApps().find((app) => app.name === APP_NAME);

  try {
    const app =
      existing ??
      initializeApp(
        {
          // Throws on a malformed key — a placeholder left in `.env`, a value
          // that lost its newline escaping in a hosting dashboard. That is a
          // configuration mistake, not a reason to fail every public page, so
          // it degrades to "not configured" here and surfaces as a clear error
          // on the write paths via `requireAdminDb()`.
          credential: cert({
            projectId: credentials.projectId,
            clientEmail: credentials.clientEmail,
            privateKey: credentials.privateKey,
          }),
        },
        APP_NAME,
      );

    const db = getFirestore(app);
    if (!existing) {
      // Undefined values are common in optional content fields (no live URL, no
      // end date); ignoring them keeps writes from failing on partial forms.
      db.settings({ ignoreUndefinedProperties: true });
    }

    cached = { app, db, auth: getAuth(app) };
    return cached;
  } catch (error) {
    initFailed = true;
    console.error(
      "[firebase] Admin SDK failed to initialise — the FIREBASE_* credentials " +
        "are present but not usable. Check that FIREBASE_PRIVATE_KEY is the real " +
        "key from your service-account JSON, quoted, with its \\n escapes intact.",
      error,
    );
    return null;
  }
}

/** Firestore handle, or `null` when Firebase is not configured. */
export function getAdminDb(): Firestore | null {
  return getAdminServices()?.db ?? null;
}

/** Firebase Auth handle, or `null` when Firebase is not configured. */
export function getAdminAuth(): Auth | null {
  return getAdminServices()?.auth ?? null;
}

/** Firestore handle that throws — for write paths, where silence is wrong. */
export function requireAdminDb(): Firestore {
  const db = getAdminDb();
  if (!db) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, " +
        "FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (see .env.example).",
    );
  }
  return db;
}

/** Firebase Auth handle that throws — for auth paths. */
export function requireAdminAuth(): Auth {
  const auth = getAdminAuth();
  if (!auth) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, " +
        "FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (see .env.example).",
    );
  }
  return auth;
}
