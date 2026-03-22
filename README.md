# HTQ

Hack-the-question / HTQ 2026 registration: static site in [`HTQ/`](HTQ/) plus Firebase **Cloud Functions**, **Firestore**, and **Storage**.

## Architecture

- **Stage 1** ([`HTQ/register.html`](HTQ/register.html)): team details and national IDs → `submitStage1` creates a `teams/{id}` document and emails the leader a link with a **hashed** token.
- **Stage 2** ([`HTQ/complete.html`](HTQ/complete.html)): `?t=` token + team name confirmation + payment image → `completeStage2` uploads to Storage and marks the team `complete`.
- **Organizers** ([`HTQ/admin.html`](HTQ/admin.html)): Firebase **Auth** (email/password) with **`admin` custom claim**; reads `teams` and receipt images from Storage.

Participant flows do **not** use Firebase Auth; only organizers use Auth for the dashboard.

## Prerequisites

- **Node.js 20+** (for local `npm` in `functions/` and Firebase CLI; Cloud Functions runtime is Node 20).
- **Firebase CLI**: `npm install -g firebase-tools`
- A **Firebase project** with **Firestore**, **Storage**, **Authentication** (Email/Password enabled for organizers), and **Blaze** plan if you deploy callable/HTTP functions that talk to external APIs (Resend).

## One-time Firebase setup

1. Create a project in the [Firebase console](https://console.firebase.google.com/) or link an existing one.
2. Set the default project ID in [`.firebaserc`](.firebaserc) (or run `firebase use <projectId>`).
3. Enable **Firestore** (production mode) and **Storage** (default bucket).
4. Enable **Authentication → Sign-in method → Email/Password** (for organizer accounts only).
5. Register a **Web app** in Project settings and copy the config into [`HTQ/js/htq-config.js`](HTQ/js/htq-config.js) (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).

## Functions environment variables

Set these for **deployed** functions (Firebase Console → Functions → your function → Environment variables, or `firebase functions:secrets:set` / `.env` for emulators):

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | [Resend](https://resend.com/) API key for stage-1 completion emails. If unset locally, the function logs the completion URL instead and **does not** send mail. |
| `RESEND_FROM` | Sender, e.g. `HTQ <noreply@yourdomain.com>` (must be allowed in Resend). |
| `PUBLIC_SITE_URL` | Public origin of the static site **without** trailing slash, e.g. `https://your-app.vercel.app`. Used in email links (`/complete.html?t=...`). |
| `CORS_ORIGINS` | Comma-separated allowed `Origin` values for browser `fetch`, e.g. `https://your-app.vercel.app`. Use `*` only for local testing. |
| `STAGE2_TOKEN_TTL_DAYS` | Optional; default `30`. |

## Organizer admin claim

1. In Firebase Authentication, create a user (email/password) for each organizer.
2. With Application Default Credentials or `GOOGLE_APPLICATION_CREDENTIALS` pointing to a service account key with **Firebase Authentication Admin**, run:

```bash
cd functions
node scripts/setAdminClaim.js organizer@example.com
```

3. The organizer signs out and signs in again (or refreshes the session) so the **ID token** includes `admin: true`.

## Local development

```bash
cd functions && npm install
cd ..
firebase emulators:start
```

- Emulator UI: [http://localhost:4000](http://localhost:4000)
- Hosting (if used): [http://localhost:5000](http://localhost:5000)
- Functions base URL for [`HTQ/js/htq-config.js`](HTQ/js/htq-config.js) `apiBase`:

`http://127.0.0.1:5001/<projectId>/us-central1`

Ensure `firebase` config in `htq-config.js` matches the emulator project.

For Resend in the emulator, add `functions/.env` (not committed) with `RESEND_API_KEY` and optionally `RESEND_FROM`, `PUBLIC_SITE_URL`, `CORS_ORIGINS=*`.

## Deploy

```bash
firebase deploy --only firestore:rules,storage:rules,functions
```

Deploy the static site:

- **Firebase Hosting**: `firebase deploy --only hosting` (serves [`HTQ/`](HTQ/)), or  
- **Vercel / Netlify**: point the site root to [`HTQ/`](HTQ/) and set production `htq-config.js` `apiBase` to  
  `https://us-central1-<projectId>.cloudfunctions.net`

Update [`HTQ/js/htq-config.js`](HTQ/js/htq-config.js) for production URLs and Firebase web config before going live.

## Security notes

- Firestore and Storage **deny** public reads; only users with **`admin` custom claim** can read team data and receipts from the client dashboard.
- Stage 1 / 2 **writes** go through Cloud Functions (Admin SDK), not direct client writes to PII collections.
- National IDs and receipts are sensitive; limit organizer accounts and define a **retention** policy for your event.

## Legacy URL

[`HTQ/upload_ids.html`](HTQ/upload_ids.html) redirects visitors to the new flow (stage 1 → `register.html`, stage 2 via email → `complete.html`).
