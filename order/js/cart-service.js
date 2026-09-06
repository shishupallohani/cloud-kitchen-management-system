/**
 * cart-service.js
 * -----------------------------------------------------------------------
 * Manages users/{uid}/cart/{dishId}.
 *
 * Logged-in users:
 *   → Firebase cart
 *
 * Guest users:
 *   → localStorage cart
 *
 * The cart always stores the CURRENT menu price at the time an item is
 * added/updated — this is intentional:
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


/* ================================================================
   FIREBASE CART
   ================================================================ */

function cartCollectionRef(uid) {
  return collection(
    db,
    APP_CONFIG.collections.users,
    uid,
    APP_CONFIG.collections.cart
  );
}


function cartDocRef(uid, dishId) {
  return doc(
    db,
    APP_CONFIG.collections.users,
    uid,
    APP_CONFIG.collections.cart,
    dishId
  );
}


/** Get all items currently in the user's Firebase cart. */
export async function getCart(uid) {

  const snapshot =
    await getDocs(
      cartCollectionRef(uid)
    );

  return snapshot.docs.map(
    (docSnap) => docSnap.data()
  );
}


/**
 * Add a dish to the Firebase cart, or increase its quantity
 * if it is already present.
 */
export async function addToCart(
  uid,
  dish,
  qty = 1
) {

  const ref =
    cartDocRef(
      uid,
      dish.dishId
    );


  const existingSnap =
    await getDoc(ref);


  const currentQty =
    existingSnap.exists()
      ? Number(
          existingSnap.data().quantity
        ) || 0
      : 0;


  await setDoc(
    ref,
    {
      dishId: dish.dishId,
      name: dish.name,
      price: dish.price,
      image: dish.image || "",
      quantity:
        currentQty + Number(qty),
    }
  );
}


/** Set a Firebase cart item's quantity directly. */
export async function updateQuantity(
  uid,
  dishId,
  quantity
) {

  if (quantity <= 0) {

    await removeFromCart(
      uid,
      dishId
    );

    return;
  }


  const ref =
    cartDocRef(
      uid,
      dishId
    );


  const existingSnap =
    await getDoc(ref);


  if (!existingSnap.exists()) {
    return;
  }


  await setDoc(
    ref,
    {
      ...existingSnap.data(),
      quantity,
    }
  );
}


/** Remove one item from the Firebase cart completely. */
export async function removeFromCart(
  uid,
  dishId
) {

  await deleteDoc(
    cartDocRef(
      uid,
      dishId
    )
  );
}


/** Empty the entire Firebase cart. */
export async function clearCart(uid) {

  const snapshot =
    await getDocs(
      cartCollectionRef(uid)
    );


  if (snapshot.empty) {
    return;
  }


  const batch =
    writeBatch(db);


  snapshot.docs.forEach(
    (docSnap) =>
      batch.delete(docSnap.ref)
  );


  await batch.commit();
}


/* ================================================================
   GUEST CART
   ================================================================ */

const GUEST_CART_KEY =
  "charroti-guest-cart-v1";


/**
 * Read the guest cart from localStorage.
 *
 * Guest cart is intentionally device/browser based.
 */
export function getGuestCart() {

  try {

    const raw =
      localStorage.getItem(
        GUEST_CART_KEY
      );


    if (!raw) {
      return [];
    }


    const parsed =
      JSON.parse(raw);


    if (!Array.isArray(parsed)) {
      return [];
    }


    return parsed
      .map(normalizeGuestItem)
      .filter(Boolean);

  } catch (error) {

    console.warn(
      "Could not read guest cart.",
      error
    );

    return [];
  }
}


/**
 * Keep only valid cart data in localStorage.
 */
function normalizeGuestItem(item) {

  if (
    !item ||
    !item.dishId ||
    !item.name
  ) {
    return null;
  }


  const price =
    Number(item.price);


  const quantity =
    Number(item.quantity);


  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return null;
  }


  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    return null;
  }


  return {

    dishId:
      String(item.dishId),

    name:
      String(item.name),

    price,

    image:
      item.image || "",

    quantity:
      Math.floor(quantity),

  };
}


/**
 * Save guest cart to localStorage.
 */
function saveGuestCart(items) {

  try {

    localStorage.setItem(
      GUEST_CART_KEY,
      JSON.stringify(items)
    );

  } catch (error) {

    console.error(
      "Could not save guest cart.",
      error
    );

    throw new Error(
      "Could not save your cart on this device."
    );
  }
}


/**
 * Add a dish to the guest cart.
 *
 * If the dish already exists, its quantity is increased.
 */
export function addToGuestCart(
  dish,
  qty = 1
) {

  const numericQty =
    Math.floor(
      Number(qty)
    );


  if (
    !dish?.dishId ||
    numericQty <= 0
  ) {
    return;
  }


  const items =
    getGuestCart();


  const dishId =
    String(dish.dishId);


  const existing =
    items.find(
      (item) =>
        item.dishId === dishId
    );


  if (existing) {

    existing.quantity +=
      numericQty;


    /*
     * Keep the latest menu information.
     */

    existing.name =
      dish.name ||
      existing.name;


    existing.price =
      Number(dish.price) ||
      existing.price;


    existing.image =
      dish.image ||
      existing.image ||
      "";

  } else {

    items.push({

      dishId,

      name:
        String(
          dish.name ||
          "Dish"
        ),

      price:
        Number(dish.price) || 0,

      image:
        dish.image || "",

      quantity:
        numericQty,

    });

  }


  saveGuestCart(items);
}


/**
 * Change the quantity of a guest cart item.
 *
 * Quantity <= 0 removes the item.
 */
export function updateGuestQuantity(
  dishId,
  quantity
) {

  const items =
    getGuestCart();


  const next =
    Math.floor(
      Number(quantity)
    );


  const index =
    items.findIndex(
      (item) =>
        item.dishId ===
        String(dishId)
    );


  if (index === -1) {
    return;
  }


  if (next <= 0) {

    items.splice(
      index,
      1
    );

  } else {

    items[index].quantity =
      next;

  }


  saveGuestCart(items);
}


/**
 * Remove a guest cart item completely.
 */
export function removeGuestCartItem(
  dishId
) {

  const items =
    getGuestCart().filter(
      (item) =>
        item.dishId !==
        String(dishId)
    );


  saveGuestCart(items);
}


/**
 * Clear the guest cart.
 *
 * Called only after guest items have successfully
 * been merged into the authenticated Firebase cart.
 */
export function clearGuestCart() {

  try {

    localStorage.removeItem(
      GUEST_CART_KEY
    );

  } catch (error) {

    console.warn(
      "Could not clear guest cart.",
      error
    );

  }
}


/* ================================================================
   GUEST CART → FIREBASE CART
   ================================================================ */

/**
 * Merge all guest-cart items into the authenticated user's
 * Firebase cart.
 *
 * Existing Firebase quantities are preserved and increased.
 *
 * The local guest cart is cleared ONLY after every item has
 * successfully been added.
 */
export async function mergeGuestCart(
  uid
) {

  if (!uid) {
    return;
  }


  const guestItems =
    getGuestCart();


  if (
    guestItems.length === 0
  ) {
    return;
  }


  for (
    const item of guestItems
  ) {

    await addToCart(
      uid,
      item,
      item.quantity
    );

  }


  /*
   * Important:
   * Do not clear local cart before the complete merge succeeds.
   */

  clearGuestCart();
}


/* ================================================================
   CALCULATIONS
   ================================================================ */

/** Sum of (price * quantity) across all cart items. */
export function calculateSubtotal(
  items
) {

  return items.reduce(
    (sum, item) =>
      sum +
      Number(item.price) *
      Number(item.quantity),
    0
  );
}


/** Total item count across the cart (for the nav badge). */
export function calculateItemCount(
  items
) {

  return items.reduce(
    (sum, item) =>
      sum +
      Number(item.quantity),
    0
  );
}


/**
 * Compute delivery charge given a subtotal,
 * honouring the configured free-delivery threshold.
 */
export function calculateDeliveryCharge(
  subtotal
) {

  if (
    APP_CONFIG.freeDeliveryThreshold > 0 &&
    subtotal >=
      APP_CONFIG.freeDeliveryThreshold
  ) {
    return 0;
  }


  return subtotal > 0
    ? APP_CONFIG.deliveryCharge
    : 0;
}