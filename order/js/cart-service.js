/**
 * cart-service.js
 * -----------------------------------------------------------------------
 * Manages users/{uid}/cart/{dishId}. The cart always stores the CURRENT
 * menu price at the time an item is added/updated — this is intentional:
 * checkout.js re-reads the cart right before order creation, and
 * order-service.js freezes those prices onto the order permanently.
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
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

function cartCollectionRef(uid) {
  return collection(db, APP_CONFIG.collections.users, uid, APP_CONFIG.collections.cart);
}

function cartDocRef(uid, dishId) {
  return doc(db, APP_CONFIG.collections.users, uid, APP_CONFIG.collections.cart, dishId);
}

/** Get all items currently in the user's cart. */
export async function getCart(uid) {
  const snapshot = await getDocs(cartCollectionRef(uid));
  return snapshot.docs.map((docSnap) => docSnap.data());
}

/**
 * Add a dish to the cart, or increase its quantity by `qty` if it's
 * already present.
 */
export async function addToCart(uid, dish, qty = 1) {
  const ref = cartDocRef(uid, dish.dishId);
  const existingSnap = await getDoc(ref);
  const currentQty = existingSnap.exists() ? existingSnap.data().quantity : 0;

  await setDoc(ref, {
    dishId: dish.dishId,
    name: dish.name,
    price: dish.price,
    image: dish.image || "",
    quantity: currentQty + qty,
  });
}

/** Set a cart item's quantity directly. A quantity of 0 or less removes it. */
export async function updateQuantity(uid, dishId, quantity) {
  if (quantity <= 0) {
    await removeFromCart(uid, dishId);
    return;
  }
  const ref = cartDocRef(uid, dishId);
  const existingSnap = await getDoc(ref);
  if (!existingSnap.exists()) return;
  await setDoc(ref, { ...existingSnap.data(), quantity });
}

/** Remove one item from the cart completely. */
export async function removeFromCart(uid, dishId) {
  await deleteDoc(cartDocRef(uid, dishId));
}

/** Empty the entire cart (called after a successful order is placed). */
export async function clearCart(uid) {
  const snapshot = await getDocs(cartCollectionRef(uid));
  if (snapshot.empty) return;
  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();
}

/** Sum of (price * quantity) across all cart items. */
export function calculateSubtotal(items) {
  return items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
}

/** Total item count across the cart (for the nav badge). */
export function calculateItemCount(items) {
  return items.reduce((sum, item) => sum + Number(item.quantity), 0);
}

/** Compute delivery charge given a subtotal, honouring the free-delivery threshold. */
export function calculateDeliveryCharge(subtotal) {
  if (
    APP_CONFIG.freeDeliveryThreshold > 0 &&
    subtotal >= APP_CONFIG.freeDeliveryThreshold
  ) {
    return 0;
  }
  return subtotal > 0 ? APP_CONFIG.deliveryCharge : 0;
}
