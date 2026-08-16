import { initAdmin, fail, style } from "./firebase-admin.mjs";

/**
 * Grants (or revokes) administrator access for a Firebase Auth user.
 *
 *   npm run set-admin -- you@example.com
 *   npm run set-admin -- you@example.com --revoke
 *
 * With no address it falls back to ADMIN_EMAIL, so the owner does not retype
 * their own address. That variable is a convenience, not an authorisation: it
 * decides which account this script looks up, and nothing reads it at runtime.
 *
 * Admin access is two independent facts, and this script maintains both:
 *
 *   1. the custom claim `admin: true` on the user's Auth token — this is what
 *      firestore.rules checks, and it can only be set with the service-account
 *      credentials, never from a browser; and
 *   2. an allowlist document at `admins/{uid}` — this is what lets access be
 *      revoked instantly, without waiting up to an hour for a token to refresh.
 *
 * Both must hold for `getCurrentAdmin()` to return a user. See
 * src/lib/firebase/session.ts.
 */

const args = process.argv.slice(2);
const revoke = args.includes("--revoke");
const email = args.find((arg) => !arg.startsWith("--")) ?? process.env.ADMIN_EMAIL;

if (!email) {
  fail(
    "Usage: npm run set-admin -- <email> [--revoke]\n" +
      `  ${style.dim("Or set ADMIN_EMAIL in .env.local to omit the address.")}\n` +
      `  ${style.dim("The account must already exist in Firebase Authentication.")}`,
  );
}

const { auth, db, projectId } = initAdmin();

console.log(`\n${style.dim(`Project: ${projectId}`)}`);

let user;
try {
  user = await auth.getUserByEmail(email);
} catch (error) {
  if (error.code === "auth/user-not-found") {
    fail(
      `No Firebase Auth user with the email ${style.bold(email)}.\n` +
        `  Create the account first: Firebase console → Authentication → Users → Add user.`,
    );
  }
  fail(`Could not look up ${email}: ${error.message}`);
}

if (revoke) {
  // Claim first, then the allowlist. If the second step fails the account is
  // already locked out, which is the safe direction for a partial failure.
  await auth.setCustomUserClaims(user.uid, { admin: false });
  await db.collection("admins").doc(user.uid).delete();
  // Existing session cookies stay valid until they are re-verified; the app
  // verifies with `checkRevoked: true`, so this ends them on the next request.
  await auth.revokeRefreshTokens(user.uid);

  console.log(`${style.green("✔")} Revoked admin access for ${style.bold(email)}`);
  console.log(`  ${style.dim(`uid: ${user.uid}`)}`);
  console.log(`  ${style.dim("Existing sessions are invalidated on their next request.")}\n`);
} else {
  await auth.setCustomUserClaims(user.uid, { admin: true });
  await db.collection("admins").doc(user.uid).set(
    {
      email: user.email ?? null,
      name: user.displayName ?? null,
      grantedAt: new Date(),
    },
    { merge: true },
  );

  console.log(`${style.green("✔")} Granted admin access to ${style.bold(email)}`);
  console.log(`  ${style.dim(`uid: ${user.uid}`)}`);
  console.log(
    `  ${style.dim("Sign in at /admin/login. If you were already signed in, sign out and back in so the new claim is on your token.")}\n`,
  );
}

process.exit(0);
