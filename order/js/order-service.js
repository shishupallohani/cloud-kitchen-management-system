/**
 * order-service.js
 * -----------------------------------------------------------------------
 * All Firestore access for the orders/{orderId} collection.
 *
 * IMPORTANT: order items always store a frozen snapshot of dishId, name,
 * price, and quantity AT THE TIME OF ORDERING. Historical orders must
 * never be recalculated against the current menu price — createOrder()
 * is the only place prices get written, and nothing here ever re-reads
 * menu-service.js prices for an existing order.
 *
 * Order status and payment status are written once at creation time with
 * safe initial values and are otherwise treated as read-only from the
 * customer app — firestore.rules blocks customers from changing them,
 * reserving that for a future admin/back-office tool.
 * -----------------------------------------------------------------------
 */

import { db } from "./firebase.js";
import { APP_CONFIG, ORDER_STATUS } from "./config.js";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

function ordersCollectionRef() {
  return collection(db, APP_CONFIG.collections.orders);
}

/** Generate a short, human-friendly, sufficiently-unique order id, e.g. CR7F3K9Q2. */
function generateOrderId() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  const timePart = Date.now().toString(36).slice(-4).toUpperCase();
  return `${APP_CONFIG.orderIdPrefix}${timePart}${random}`;
}

/**
 * Create a new order document.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {object} params.customer - { name, email, mobile, address, landmark, city }
 * @param {Array}  params.items - [{ dishId, name, price, quantity }]
 * @param {number} params.subtotal
 * @param {number} params.deliveryCharge
 * @param {number} params.totalAmount
 * @param {string} params.paymentMethod - "COD" | "UPI"
 * @param {string} params.paymentStatus - initial status from payment-service.js
 * @returns {Promise<object>} the created order, including its orderId
 */
export async function createOrder(params) {
  const orderId = generateOrderId();
  const now = new Date().toISOString();

  const order = {
    orderId,
    userId: params.userId,
    customerName: params.customer.name,
    email: params.customer.email,
    mobile: params.customer.mobile,
    address: params.customer.address,
    landmark: params.customer.landmark || "",
    city: params.customer.city,

    // Frozen at creation time — never recalculated from live menu data.
    items: params.items.map((item) => ({
      dishId: item.dishId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),

    subtotal: params.subtotal,
    deliveryCharge: params.deliveryCharge,
    totalAmount: params.totalAmount,

    paymentMethod: params.paymentMethod,
    paymentStatus: params.paymentStatus,

    orderStatus: ORDER_STATUS.PENDING,

    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(ordersCollectionRef(), orderId), order);
  return order;
}

/** Get a single order by id. Returns null if not found. */
export async function getOrderById(orderId) {
  const snapshot = await getDoc(doc(ordersCollectionRef(), orderId));
  return snapshot.exists() ? snapshot.data() : null;
}

/** Get every order placed by a given user, most recent first. */
export async function getOrdersByUser(userId) {
  const q = query(
    ordersCollectionRef(),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => docSnap.data());
}
