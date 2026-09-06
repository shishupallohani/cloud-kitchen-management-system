/**
 * config.js
 * -----------------------------------------------------------------------
 * Single source of truth for every value that is likely to change without
 * a code change: branding, currency, delivery charge, UPI details, support
 * contact info, and Firestore collection names.
 *
 * Nothing else in the codebase should hard-code these values. When the
 * business changes the delivery charge or UPI ID, this is the only file
 * that needs to be edited.
 * -----------------------------------------------------------------------
 */

export const APP_CONFIG = {
  // Branding
  kitchenName: "Charroti Kitchen",
  supportPhone: "+91-90000-00000",
  supportEmail: "support@charrotikitchen.com",

  // Currency / pricing
  currencySymbol: "\u20B9", // ₹
  deliveryCharge: 30,
  freeDeliveryThreshold: 499, // order subtotal at/above which delivery is free (0 to disable)

  // Order id
  orderIdPrefix: "CR",

  // Payment
  upi: {
    upiId: "charrotikitchen@upi",
    payeeName: "Charroti Kitchen",
    // Place a real QR image at assets/images/upi-qr.png, or leave this
    // pointing at the placeholder and it will be used to build a QR
    // dynamically from the UPI fields above (see payment-service.js).
    qrImagePath: "assets/images/upi-qr.png",
  },

  // Menu data source: "local" uses MOCK data bundled with the app so the
  // ordering flow can be demoed/tested before Firestore menu data exists.
  // Flip to "firestore" once the real Charroti Kitchen menu collection is
  // ready — no other file needs to change (see menu-service.js).
  menuSource: "local", // "local" | "firestore"

  // Firestore collection / subcollection names, centralised so a future
  // integration can rename them in one place if needed.
  collections: {
    users: "users",
    orders: "orders",
    menu: "menu",
    favorites: "favorites", // subcollection under users/{uid}
    cart: "cart", // subcollection under users/{uid}
  },
};

export const ORDER_STATUS = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

// Ordered pipeline used to render the order-status tracker UI.
export const ORDER_STATUS_STEPS = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
  ORDER_STATUS.DELIVERED,
];

export const PAYMENT_METHOD = {
  COD: "COD",
  UPI: "UPI",
};

export const PAYMENT_STATUS = {
  PENDING: "Pending",
  AWAITING_CONFIRMATION: "Awaiting Confirmation",
  PAID: "Paid",
  FAILED: "Failed",
};
