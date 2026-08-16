import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/**
 * Firebase browser SDK.
 *
 * Only the admin sign-in screen uses this, and only to exchange an email and
 * password for an ID token. Every read and write in the app goes through the
 * Admin SDK on the server, so no Firestore handle is exported here.
 *
 * The values below are the *public* Firebase config. They are safe to ship —
 * they identify the project, they do not authorise anything. Authorisation is
 * enforced by Firestore security rules and by the server-side admin check.
 * Private service-account credentials live in `admin.ts` and never reach the
 * browser.
 */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseClientConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId,
  );
}

function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseClientConfigured()) {
    throw new Error(
      "Firebase client config is missing. Set the NEXT_PUBLIC_FIREBASE_* " +
        "variables listed in .env.example.",
    );
  }
  return getApps().length > 0
    ? getApp()
    : initializeApp({
        apiKey: firebaseConfig.apiKey!,
        authDomain: firebaseConfig.authDomain!,
        projectId: firebaseConfig.projectId!,
        storageBucket: firebaseConfig.storageBucket,
        messagingSenderId: firebaseConfig.messagingSenderId,
        appId: firebaseConfig.appId,
      });
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}
