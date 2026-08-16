"use server";

import { isAdminConfigured } from "@/lib/firebase/admin";
import {
  clearSessionCookie,
  createSessionCookie,
  NotAuthorizedError,
  setSessionCookie,
  touchAdminLastLogin,
} from "@/lib/firebase/session";

import { actionError, actionSuccess, type ActionResult } from "./action-result";

/**
 * Admin sign-in and sign-out.
 *
 * The browser never holds a long-lived Firebase credential. It signs in just
 * long enough to mint an ID token, hands that token to this action, and the
 * server exchanges it for an httpOnly session cookie — unreadable from
 * JavaScript, so an XSS bug on the page cannot steal the session.
 *
 * The authorization decision lives entirely in `createSessionCookie`, which
 * refuses to issue a cookie unless the account carries the `admin: true` claim
 * *and* appears on the Firestore allowlist. A valid password for a non-admin
 * Firebase account gets a token but never a session.
 */

export async function signInWithIdToken(idToken: unknown): Promise<ActionResult> {
  if (typeof idToken !== "string" || idToken.length === 0) {
    return actionError("Sign-in failed. Please try again.");
  }

  if (!isAdminConfigured()) {
    return actionError(
      "Server credentials are not configured. Set the FIREBASE_* variables from .env.example.",
    );
  }

  try {
    const { cookie, uid } = await createSessionCookie(idToken);
    await setSessionCookie(cookie);
    // The uid comes from the verified token, never from the client.
    await touchAdminLastLogin(uid);
    return actionSuccess();
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      // Deliberately explicit: the credentials were correct, the account simply
      // is not an administrator. Nothing sensitive is disclosed by saying so.
      return actionError("This account is not authorized for admin access.");
    }

    console.error("[auth] session exchange failed", error);
    return actionError("Sign-in failed. Please try again.");
  }
}

export async function signOutAdmin(): Promise<ActionResult> {
  await clearSessionCookie();
  return actionSuccess();
}
