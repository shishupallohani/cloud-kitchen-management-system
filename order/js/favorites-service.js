/**
 * favorites-service.js
 * -----------------------------------------------------------------------
 * Manages users/{uid}/favorites/{dishId}. Every function requires a uid so
 * that a customer can only ever act on their own favorites — enforced
 * again server-side by firestore.rules.
 * -----------------------------------------------------------------------
 */

import { db } from "./firebase.js";
import { APP_CONFIG } from "./config.js";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

function favoritesCollectionRef(uid) {
  return collection(db, APP_CONFIG.collections.users, uid, APP_CONFIG.collections.favorites);
}

function favoriteDocRef(uid, dishId) {
  return doc(db, APP_CONFIG.collections.users, uid, APP_CONFIG.collections.favorites, dishId);
}

/** Add a dish to the user's favorites. Stores a lightweight snapshot of the dish. */
export async function addFavorite(uid, dish) {
  await setDoc(favoriteDocRef(uid, dish.dishId), {
    dishId: dish.dishId,
    name: dish.name,
    price: dish.price,
    image: dish.image || "",
    category: dish.category || "",
    addedAt: serverTimestamp(),
  });
}

/** Remove a dish from the user's favorites. */
export async function removeFavorite(uid, dishId) {
  await deleteDoc(favoriteDocRef(uid, dishId));
}

/** Check whether a specific dish is already favorited by the user. */
export async function isFavorite(uid, dishId) {
  const snapshot = await getDoc(favoriteDocRef(uid, dishId));
  return snapshot.exists();
}

/** Get all of the user's favorite dishes. */
export async function getFavorites(uid) {
  const snapshot = await getDocs(favoritesCollectionRef(uid));
  return snapshot.docs.map((docSnap) => docSnap.data());
}

/** Toggle a dish's favorite status. Returns the new state (true = now favorited). */
export async function toggleFavorite(uid, dish) {
  const favorited = await isFavorite(uid, dish.dishId);
  if (favorited) {
    await removeFavorite(uid, dish.dishId);
    return false;
  }
  await addFavorite(uid, dish);
  return true;
}
