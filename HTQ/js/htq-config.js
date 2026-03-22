/**
 * Default dev-oriented config. Replace firebase.* and apiBase for production.
 * See htq-config.sample.js.
 */
window.HTQ_CONFIG = {
  apiBase: "http://127.0.0.1:5001/demo-htq/us-central1",
  firebase: {
    apiKey: "demo-api-key",
    authDomain: "demo-htq.firebaseapp.com",
    projectId: "demo-htq",
    storageBucket: "demo-htq.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef",
  },
};
