/**
 * auth.js
 * -----------------------------------------------------------------------
 * Admin authentication. Client-side redirects are UX convenience only —
 * real protection is Firestore Security Rules (firestore.rules), which
 * only allow writes from a signed-in, authorized admin UID.
 * -----------------------------------------------------------------------
 */

import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

export function loginAdmin(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logoutAdmin() {
  return signOut(auth);
}

/** Resolves once with the current user (or null). Doesn't keep listening. */
export function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/** Keeps calling `callback(user)` on every auth state change. */
export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

function friendlyAuthError(err) {
  const map = {
    "auth/invalid-email": "That doesn't look like a valid email address.",
    "auth/user-not-found": "No admin account found for that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  };
  return map[err.code] || "Couldn't sign in. Please try again.";
}

export { friendlyAuthError };
