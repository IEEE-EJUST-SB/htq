/**
 * Copy to htq-config.js and fill in values from the Firebase console (Project settings).
 * apiBase: Cloud Functions base URL (no trailing slash).
 *   Emulator: http://127.0.0.1:5001/<projectId>/us-central1
 *   Production: https://us-central1-<projectId>.cloudfunctions.net
 */
window.HTQ_CONFIG = {
  apiBase: "http://127.0.0.1:5001/htq-2026/us-central1",
  firebase: {
    apiKey: "YOUR_WEB_API_KEY",
    authDomain: "htq-2026.firebaseapp.com",
    projectId: "htq-2026",
    storageBucket: "htq-2026.appspot.com",
    messagingSenderId: "",
    appId: "",
  },
};
