/**
 * payment-service.js
 * -----------------------------------------------------------------------
 * Payment abstraction layer. Checkout never branches on "if COD else if
 * UPI" itself — it asks this module for the selected strategy and calls
 * a uniform interface. Adding a real gateway later (Razorpay, Cashfree,
 * Stripe...) means adding one more object to PAYMENT_STRATEGIES that
 * implements the same shape; nothing in checkout.html/checkout.js changes.
 *
 * Strategy interface:
 *   {
 *     key: string,
 *     label: string,
 *     getInitialPaymentStatus(): string,
 *     // `initiate` runs any pre-order-creation step a real gateway would
 *     // need (e.g. opening a payment sheet). For COD/UPI-QR this is a
 *     // no-op that resolves immediately.
 *     initiate(orderContext): Promise<{ success: boolean, message?: string }>
 *   }
 * -----------------------------------------------------------------------
 */

import { APP_CONFIG, PAYMENT_METHOD, PAYMENT_STATUS } from "./config.js";

const CODPayment = {
  key: PAYMENT_METHOD.COD,
  label: "Cash on Delivery",
  getInitialPaymentStatus() {
    return PAYMENT_STATUS.PENDING;
  },
  async initiate() {
    // Nothing to do up-front for COD — payment happens at the door.
    return { success: true };
  },
};

const UPIPayment = {
  key: PAYMENT_METHOD.UPI,
  label: "UPI (QR Code)",
  getInitialPaymentStatus() {
    // The customer scans and pays outside the app, so the order starts
    // as "awaiting confirmation" until an admin/back-office step marks
    // it Paid (payment status is intentionally not customer-editable —
    // see firestore.rules).
    return PAYMENT_STATUS.AWAITING_CONFIRMATION;
  },
  async initiate() {
    return { success: true };
  },
  /** Build a standard `upi://pay` deep link from the configured UPI id. */
  buildUpiUri(amount, orderRef) {
    const params = new URLSearchParams({
      pa: APP_CONFIG.upi.upiId,
      pn: APP_CONFIG.upi.payeeName,
      am: String(amount),
      cu: "INR",
      tn: `Order ${orderRef || ""}`.trim(),
    });
    return `upi://pay?${params.toString()}`;
  },
};

// Placeholder for future gateways — intentionally NOT implemented yet
// per project scope. Kept here as a documented extension point.
// const RazorpayPayment = { key: "RAZORPAY", label: "Card / Netbanking", ... };

const PAYMENT_STRATEGIES = {
  [PAYMENT_METHOD.COD]: CODPayment,
  [PAYMENT_METHOD.UPI]: UPIPayment,
};

/** Get every payment method the checkout screen should offer. */
export function getAvailablePaymentMethods() {
  return Object.values(PAYMENT_STRATEGIES);
}

/** Look up a strategy by its key (e.g. "COD" or "UPI"). */
export function getPaymentStrategy(methodKey) {
  const strategy = PAYMENT_STRATEGIES[methodKey];
  if (!strategy) {
    throw new Error(`Unknown payment method: ${methodKey}`);
  }
  return strategy;
}

export { UPIPayment };
