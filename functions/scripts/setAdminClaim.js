/**
 * Grant admin dashboard access (Firestore/Storage rules expect request.auth.token.admin === true).
 *
 * Usage (with Application Default Credentials or GOOGLE_APPLICATION_CREDENTIALS):
 *   node scripts/setAdminClaim.js organizer@example.com
 *
 * Or with a service account JSON:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/setAdminClaim.js organizer@example.com
 */
const path = require("path");
const admin = require("firebase-admin");

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/setAdminClaim.js <organizer-email>");
  process.exit(1);
}

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      admin.initializeApp({ projectId: "demo-htq" });
    } else {
      admin.initializeApp();
    }
  } catch (e) {
    console.error(
      "Failed to initialize admin. Set GOOGLE_APPLICATION_CREDENTIALS or run: firebase login --reauth"
    );
    process.exit(1);
  }
}

(async () => {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  console.log(`Custom claim { admin: true } set for ${email} (uid=${user.uid})`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
