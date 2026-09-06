/**
 * auth.js
 * -----------------------------------------------------------------------
 * All Firebase Authentication calls live here and nowhere else. Pages
 * never call the Firebase SDK directly — they call these functions, which
 * return plain { success, data } / { success, error } style results with
 * user-friendly error messages so the UI layer never has to know about
 * raw Firebase error codes.
 * -----------------------------------------------------------------------
 */

import { auth } from "./firebase.js";
import "./theme-sync.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updatePassword,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";


/** Map raw Firebase Auth error codes to user-friendly messages. */
function mapAuthError(error) {
  const code = error?.code || "";

  const map = {
    "auth/email-already-in-use":
      "An account with this email already exists. Try logging in instead.",

    "auth/invalid-email":
      "Please enter a valid email address.",

    "auth/weak-password":
      "Password is too weak. Use at least 6 characters.",

    "auth/user-not-found":
      "No account found with this email.",

    "auth/wrong-password":
      "Incorrect email or password.",

    "auth/invalid-credential":
      "Incorrect email or password.",

    "auth/too-many-requests":
      "Too many attempts. Please wait a moment and try again.",

    "auth/network-request-failed":
      "Network error. Please check your internet connection.",

    "auth/requires-recent-login":
      "Please log in again to complete this action.",

    "auth/user-disabled":
      "This account has been disabled. Contact support for help.",
  };

  return (
    map[code] ||
    "Something went wrong. Please try again."
  );
}


/**
 * Register a new customer with email/password.
 * Returns { success: true, user } or { success: false, message }.
 * Does NOT write anything to Firestore — that's user-service.js's job.
 */
export async function registerWithEmail(
  email,
  password
) {
  try {

    const credential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    return {
      success: true,
      user: credential.user,
    };

  } catch (error) {

    return {
      success: false,
      message: mapAuthError(error),
    };
  }
}


/** Log in an existing customer. */
export async function loginWithEmail(
  email,
  password
) {
  try {

    const credential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    return {
      success: true,
      user: credential.user,
    };

  } catch (error) {

    return {
      success: false,
      message: mapAuthError(error),
    };
  }
}


/** Log the current customer out. */
export async function logout() {
  try {

    await signOut(auth);

    return {
      success: true,
    };

  } catch (error) {

    return {
      success: false,
      message: mapAuthError(error),
    };
  }
}


/** Send password reset email. */
export async function sendResetEmail(email) {
  try {

    await sendPasswordResetEmail(
      auth,
      email
    );

    return {
      success: true,
    };

  } catch (error) {

    return {
      success: false,
      message: mapAuthError(error),
    };
  }
}


/** Change the logged-in user's password. */
export async function changePassword(
  newPassword
) {
  try {

    if (!auth.currentUser) {

      return {
        success: false,
        message:
          "You must be logged in to change your password.",
      };
    }

    await updatePassword(
      auth.currentUser,
      newPassword
    );

    return {
      success: true,
    };

  } catch (error) {

    return {
      success: false,
      message: mapAuthError(error),
    };
  }
}


/** Subscribe to auth state changes. */
export function onAuthChange(callback) {
  return onAuthStateChanged(
    auth,
    callback
  );
}


/** Get the current user synchronously. */
export function getCurrentUser() {
  return auth.currentUser;
}