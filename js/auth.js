/**
 * auth.js
 * -----------------------------------------------------------------------
 * Admin authentication + admin authorization.
 *
 * Authentication:
 *   Firebase Email/Password login
 *
 * Authorization:
 *   Only explicitly approved admin UIDs can access the Admin Panel.
 *
 * IMPORTANT:
 *   Customer accounts can exist in the same Firebase Authentication
 *   project, but they are NOT automatically admins.
 * -----------------------------------------------------------------------
 */

import { auth } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";


// -----------------------------------------------------------------------
// ADMIN ALLOWLIST
// -----------------------------------------------------------------------
//
// Only these Firebase Authentication UIDs are allowed to enter
// the Admin Panel.
//
// Your existing admin UID:
// 8R0axsx0iedUp83VojQW6QUU8nI3
//
// Add another admin UID here later if you intentionally want to
// give another person Admin Panel access.
//
// DO NOT add customer UIDs here.
// -----------------------------------------------------------------------

const ADMIN_UIDS = new Set([
  "8R0axsx0iedUp83VojQW6QUU8nI3",
]);


// -----------------------------------------------------------------------
// Check whether a Firebase user is an authorized admin
// -----------------------------------------------------------------------

export function isAdminUser(user) {
  if (!user) {
    return false;
  }

  return ADMIN_UIDS.has(user.uid);
}


// -----------------------------------------------------------------------
// Admin login
// -----------------------------------------------------------------------

export async function loginAdmin(email, password) {
  const credential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  const user = credential.user;

  console.log("LOGIN USER UID:", user.uid);
console.log("IS ADMIN:", isAdminUser(user));

  // Firebase authentication succeeded,
  // but now we also verify Admin authorization.
  if (!isAdminUser(user)) {
    // Very important:
    // Customer must NOT remain logged in after trying
    // to access the Admin Panel.
    await signOut(auth);

    const error = new Error(
      "This account is not authorized to access the Admin Panel."
    );

    error.code = "auth/not-admin";

    throw error;
  }

  return credential;
}


// -----------------------------------------------------------------------
// Logout
// -----------------------------------------------------------------------

export function logoutAdmin() {
  return signOut(auth);
}


// -----------------------------------------------------------------------
// Get current Firebase user
// -----------------------------------------------------------------------

/**
 * Resolves once with the current user (or null).
 */
export function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}


// -----------------------------------------------------------------------
// Watch authentication + authorization state
// -----------------------------------------------------------------------

/**
 * Calls callback only when the authentication state changes.
 *
 * IMPORTANT:
 * The callback receives:
 *   - authorized admin user
 *   - null for unauthenticated users
 *   - null for authenticated non-admin users
 *
 * Therefore customer accounts can never enter the Admin Panel.
 */
export function watchAuthState(callback) {
  return onAuthStateChanged(auth, async (user) => {

    // Not logged in
    if (!user) {
      callback(null);
      return;
    }

    // Logged in but NOT an admin
    if (!isAdminUser(user)) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error(
          "Failed to sign out unauthorized user:",
          error
        );
      }

      callback(null);
      return;
    }

    // Authorized admin
    callback(user);
  });
}


// -----------------------------------------------------------------------
// Friendly authentication errors
// -----------------------------------------------------------------------

function friendlyAuthError(err) {
  const map = {
    "auth/invalid-email":
      "That doesn't look like a valid email address.",

    "auth/user-not-found":
      "No admin account found for that email.",

    "auth/wrong-password":
      "Incorrect password.",

    "auth/invalid-credential":
      "Incorrect email or password.",

    "auth/too-many-requests":
      "Too many attempts. Please wait a moment and try again.",

    "auth/not-admin":
      "This account is not authorized to access the Admin Panel.",
  };

  return (
    map[err.code] ||
    "Couldn't sign in. Please try again."
  );
}


export { friendlyAuthError };