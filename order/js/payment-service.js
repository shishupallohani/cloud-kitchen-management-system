/**
 * payment-service.js
 * -----------------------------------------------------------------------
 * Payment abstraction layer.
 *
 * Supports:
 *   - Cash on Delivery
 *   - UPI
 *
 * UPI also exposes buildUpiUri() so checkout can launch
 * a UPI payment application with the amount pre-filled.
 * -----------------------------------------------------------------------
 */

import {
  APP_CONFIG,
  PAYMENT_METHOD,
  PAYMENT_STATUS
} from "./config.js";


/* ========================================================================
   CASH ON DELIVERY
   ======================================================================== */

const CODPayment = {

  key: PAYMENT_METHOD.COD,

  label: "Cash on Delivery",

  getInitialPaymentStatus() {

    return PAYMENT_STATUS.PENDING;

  },

  async initiate() {

    return {
      success: true
    };

  }

};


/* ========================================================================
   UPI
   ======================================================================== */

const UPIPayment = {

  key: PAYMENT_METHOD.UPI,

  label: "UPI (QR Code)",


  getInitialPaymentStatus() {

    /*
     * UPI payment is confirmed separately.
     * Therefore the order initially remains
     * Awaiting Confirmation.
     */

    return PAYMENT_STATUS.AWAITING_CONFIRMATION;

  },


  async initiate() {

    /*
     * No payment gateway is initiated here.
     *
     * The customer can:
     *
     * 1. Pay using a UPI application
     * 2. Scan the QR code
     *
     * The existing order flow remains unchanged.
     */

    return {
      success: true
    };

  },


  /**
   * Build a standard UPI payment URI.
   *
   * Example:
   *
   * upi://pay?pa=merchant@upi&pn=Charroti%20Kitchen&am=880&cu=INR
   */
  buildUpiUri(amount, orderRef = "") {

    const numericAmount =
      Number(amount);


    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {

      throw new Error(
        "Invalid UPI payment amount."
      );

    }


    const params =
      new URLSearchParams({

        pa:
          APP_CONFIG.upi.upiId,

        pn:
          APP_CONFIG.upi.payeeName,

        am:
          numericAmount.toFixed(2),

        cu:
          "INR",

        tn:
          `Order ${orderRef}`.trim()

      });


    return `upi://pay?${params.toString()}`;

  }

};


/* ========================================================================
   PAYMENT STRATEGIES
   ======================================================================== */

const PAYMENT_STRATEGIES = {

  [PAYMENT_METHOD.COD]:
    CODPayment,

  [PAYMENT_METHOD.UPI]:
    UPIPayment

};


/* ========================================================================
   PUBLIC API
   ======================================================================== */

export function getAvailablePaymentMethods() {

  return Object.values(
    PAYMENT_STRATEGIES
  );

}


export function getPaymentStrategy(
  methodKey
) {

  const strategy =
    PAYMENT_STRATEGIES[
      methodKey
    ];


  if (!strategy) {

    throw new Error(
      `Unknown payment method: ${methodKey}`
    );

  }


  return strategy;

}


export {
  UPIPayment
};