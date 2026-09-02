/**
 * firebase.js
 * -----------------------------------------------------------------------
 * Single source of truth for Firebase initialization.
 *
 * IMPORTANT — SEPARATE PROJECT:
 * This must point to the "cloud-kitchen" Firebase project ONLY.
 * Never reuse the dispatch-news Firebase project, database, or auth here.
 *
 * Firebase web config values (apiKey, authDomain, etc.) are not secret —
 * they identify your project, they don't authorize access on their own.
 * Actual protection comes from firestore.rules. See firestore.rules and
 * README.md before deploying.
 *
 * Fill in the values below with your own "cloud-kitchen" Firebase project
 * config (Firebase Console → Project Settings → General → Your apps → SDK
 * setup and configuration).
 * -----------------------------------------------------------------------
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  connectFirestoreEmulator,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getAuth,
  connectAuthEmulator,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// -------------------------------------------------------------------------
// 1. REPLACE WITH YOUR OWN "cloud-kitchen" FIREBASE PROJECT CONFIG
// -------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBQQt7gIkUyjLAOZAIyFa35DVmeXbdb0f0",
  authDomain: "charroti-899f2.firebaseapp.com",
  projectId: "charroti-899f2",
  storageBucket: "charroti-899f2.firebasestorage.app",
  messagingSenderId: "654078787380",
  appId: "1:654078787380:web:6eea7c7a69bc87a92aef61",
  measurementId: "G-TGHQ6P0QKG"
};

// Set to true only while developing against local Firebase emulators.
const USE_EMULATORS = false;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "default");
const auth = getAuth(app);

if (USE_EMULATORS) {
  connectFirestoreEmulator(db, "localhost", 8080);
  connectAuthEmulator(auth, "http://localhost:9099");
}

export { app, db, auth };


