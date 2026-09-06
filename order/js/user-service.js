/**
 * user-service.js
 * -----------------------------------------------------------------------
 * Low-level Firestore access for the users/{uid} document. This is the
 * only file that talks to Firestore for user profile data. Higher-level
 * pages (registration, profile page) call these functions rather than
 * using the Firestore SDK directly.
 *
 * NOTE: passwords are never stored here or anywhere in Firestore —
 * Firebase Authentication owns credentials exclusively (see auth.js).
 * -----------------------------------------------------------------------
 */

import { db } from "./firebase.js";
import { APP_CONFIG } from "./config.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

function userDocRef(uid) {
  return doc(db, APP_CONFIG.collections.users, uid);
}

/**
 * Create the users/{uid} profile document right after successful
 * Firebase Authentication registration.
 */
export async function createUserProfile(uid, profile) {
  const payload = {
    name: profile.name || "",
    email: profile.email || "",
    mobile: profile.mobile || "",
    address: profile.address || "",
    landmark: profile.landmark || "",
    city: profile.city || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(userDocRef(uid), payload);
  return payload;
}

/** Fetch the users/{uid} profile document. Returns null if it doesn't exist. */
export async function getUserProfile(uid) {
  const snapshot = await getDoc(userDocRef(uid));
  if (!snapshot.exists()) return null;
  return { uid, ...snapshot.data() };
}

/**
 * Update editable profile fields. Email/password are intentionally never
 * touched here — those live exclusively in Firebase Authentication.
 */
export async function updateUserProfile(uid, updates) {
  const allowedFields = ["name", "mobile", "address", "landmark", "city"];
  const payload = { updatedAt: serverTimestamp() };
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      payload[field] = updates[field];
    }
  }
  await updateDoc(userDocRef(uid), payload);
  return payload;
}
