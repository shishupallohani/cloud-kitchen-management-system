import { requireAuth } from "../auth-guard.js";
import { renderNav } from "../nav.js";
import { getUserProfile } from "../user-service.js";
import { saveProfile } from "../profile-service.js";

import {
  getCart,
  calculateSubtotal,
  calculateDeliveryCharge,
  clearCart,
  calculateItemCount
} from "../cart-service.js";

import {
  getAvailablePaymentMethods,
  getPaymentStrategy,
  UPIPayment
} from "../payment-service.js";

import { createOrder } from "../order-service.js";

import {
  PAYMENT_METHOD,
  APP_CONFIG
} from "../config.js";

import {
  formatCurrency,
  escapeHtml,
  showError,
  showSuccess,
  setButtonLoading,
  updateCartBadge
} from "../ui.js";


/* ========================================================================
   AUTHENTICATION

   Checkout is account-required.

   If a guest opens checkout directly, requireAuth() will send them
   through the login flow. The updated auth-guard keeps the intended
   checkout page as the redirect target.
   ======================================================================== */

const user = await requireAuth();

renderNav("cart");


const loadingEl =
  document.getElementById("checkout-loading");

const layoutEl =
  document.getElementById("checkout-layout");


let profile = null;
let cartItems = [];

let selectedPaymentMethod =
  PAYMENT_METHOD.COD;


/* ========================================================================
   INIT
   ======================================================================== */

async function init() {

  try {

    const [profileResult, items] =
      await Promise.all([
        getUserProfile(user.uid),
        getCart(user.uid)
      ]);


    profile =
      profileResult || {
        name: "",
        mobile: "",
        address: "",
        landmark: "",
        city: "",
        email: user.email
      };


    cartItems = items;


    updateCartBadge(
      calculateItemCount(items)
    );


    if (cartItems.length === 0) {

      loadingEl.innerHTML = `
        <div class="state-panel state-panel--empty">

          <div class="state-panel__icon">
            🛒
          </div>

          <p>
            Your cart is empty. Add items before checking out.
          </p>

        </div>
      `;

      return;
    }


    loadingEl.style.display = "none";

    layoutEl.style.display = "grid";


    renderDeliveryView();

    renderPaymentOptions();

    renderOrderReview();

    bindUpiAppButtons();


  } catch (error) {

    console.error(
      "CHECKOUT INIT ERROR:",
      error
    );


    loadingEl.innerHTML = `
      <div class="state-panel state-panel--error">

        <div class="state-panel__icon">
          ⚠️
        </div>

        <p>
          We couldn't load checkout. Please refresh the page.
        </p>

      </div>
    `;
  }
}


/* ========================================================================
   DELIVERY INFO
   ======================================================================== */

function renderDeliveryView() {

  const viewEl =
    document.getElementById(
      "delivery-info-view"
    );


  viewEl.innerHTML = `
    <p>
      <strong>
        ${escapeHtml(profile.name || "—")}
      </strong>
    </p>

    <p>
      ${escapeHtml(profile.mobile || "—")}
    </p>

    <p>
      ${escapeHtml(profile.address || "—")}
      ${
        profile.landmark
          ? ", " + escapeHtml(profile.landmark)
          : ""
      }
    </p>

    <p>
      ${escapeHtml(profile.city || "—")}
    </p>
  `;
}


/* ========================================================================
   EDIT DELIVERY
   ======================================================================== */

document
  .getElementById("edit-delivery-btn")
  .addEventListener(
    "click",
    () => {

      const formEl =
        document.getElementById(
          "delivery-info-form"
        );

      const viewEl =
        document.getElementById(
          "delivery-info-view"
        );


      document.getElementById(
        "checkout-name"
      ).value =
        profile.name || "";


      document.getElementById(
        "checkout-mobile"
      ).value =
        profile.mobile || "";


      document.getElementById(
        "checkout-address"
      ).value =
        profile.address || "";


      document.getElementById(
        "checkout-landmark"
      ).value =
        profile.landmark || "";


      document.getElementById(
        "checkout-city"
      ).value =
        profile.city || "";


      viewEl.style.display =
        "none";

      formEl.style.display =
        "block";
    }
  );


/* ========================================================================
   SAVE DELIVERY
   ======================================================================== */

document
  .getElementById("save-delivery-btn")
  .addEventListener(
    "click",
    async (event) => {

      const btn =
        event.currentTarget;


      const updated = {

        name:
          document
            .getElementById("checkout-name")
            .value
            .trim(),

        mobile:
          document
            .getElementById("checkout-mobile")
            .value
            .trim(),

        address:
          document
            .getElementById("checkout-address")
            .value
            .trim(),

        landmark:
          document
            .getElementById("checkout-landmark")
            .value
            .trim(),

        city:
          document
            .getElementById("checkout-city")
            .value
            .trim()
      };


      const restore =
        setButtonLoading(
          btn,
          "Saving..."
        );


      try {

        await saveProfile(
          user.uid,
          updated
        );


        profile = {
          ...profile,
          ...updated
        };


        renderDeliveryView();


        document.getElementById(
          "delivery-info-form"
        ).style.display = "none";


        document.getElementById(
          "delivery-info-view"
        ).style.display = "block";


        showSuccess(
          "Delivery details updated."
        );


      } catch (error) {

        showError(
          error.message ||
          "Couldn't save delivery details."
        );


      } finally {

        restore();
      }

    }
  );


/* ========================================================================
   PAYMENT METHOD
   ======================================================================== */

function renderPaymentOptions() {

  const container =
    document.getElementById(
      "payment-options"
    );


  const methods =
    getAvailablePaymentMethods();


  container.innerHTML =
    methods
      .map(
        (method, index) => `

          <label
            class="payment-option${
              index === 0
                ? " payment-option--selected"
                : ""
            }"
            data-method="${method.key}"
          >

            <input
              type="radio"
              name="payment-method"
              value="${method.key}"
              ${
                index === 0
                  ? "checked"
                  : ""
              }
            />

            <div>

              <div class="payment-option__label">
                ${escapeHtml(method.label)}
              </div>

              <div class="payment-option__desc">

                ${
                  method.key === PAYMENT_METHOD.COD

                    ? "Pay in cash when your order arrives."

                    : "Pay instantly using your preferred UPI app or scan the QR code."
                }

              </div>

            </div>

          </label>

        `
      )
      .join("");


  container
    .querySelectorAll(
      'input[name="payment-method"]'
    )
    .forEach((radio) => {

      radio.addEventListener(
        "change",
        () => {

          selectedPaymentMethod =
            radio.value;


          container
            .querySelectorAll(
              ".payment-option"
            )
            .forEach((el) => {

              el.classList.toggle(
                "payment-option--selected",
                el.dataset.method ===
                  selectedPaymentMethod
              );

            });


          toggleUpiPanel();

        }
      );

    });


  toggleUpiPanel();
}


/* ========================================================================
   UPI PANEL
   ======================================================================== */

function toggleUpiPanel() {

  const panel =
    document.getElementById(
      "upi-panel"
    );


  if (
    selectedPaymentMethod ===
    PAYMENT_METHOD.UPI
  ) {

    document.getElementById(
      "upi-qr-image"
    ).src =
      APP_CONFIG.upi.qrImagePath;


    document.getElementById(
      "upi-id-text"
    ).textContent =
      `UPI ID: ${APP_CONFIG.upi.upiId}`;


    panel.classList.add(
      "upi-panel--visible"
    );


  } else {

    panel.classList.remove(
      "upi-panel--visible"
    );

  }
}


/* ========================================================================
   UPI APP BUTTONS
   ======================================================================== */

function bindUpiAppButtons() {

  const buttons =
    document.querySelectorAll(
      ".upi-app-button"
    );


  buttons.forEach((button) => {

    button.addEventListener(
      "click",
      () => {

        openUpiApp(
          button.dataset.upiApp
        );

      }
    );

  });

}


/* ========================================================================
   OPEN UPI APP
   ======================================================================== */

function openUpiApp(appName) {

  if (
    selectedPaymentMethod !==
    PAYMENT_METHOD.UPI
  ) {

    return;
  }


  const subtotal =
    calculateSubtotal(
      cartItems
    );


  const deliveryCharge =
    calculateDeliveryCharge(
      subtotal
    );


  const totalAmount =
    subtotal + deliveryCharge;


  if (
    !Number.isFinite(totalAmount) ||
    totalAmount <= 0
  ) {

    showError(
      "Invalid payment amount."
    );

    return;
  }


  /*
   * Build the standard UPI payment URI.
   *
   * This includes:
   * - UPI ID
   * - Payee name
   * - Exact amount
   * - INR
   */

  const genericUpiUri =
    UPIPayment.buildUpiUri(
      totalAmount,
      ""
    );


  /*
   * App-specific URI schemes.
   *
   * If the selected application is installed,
   * the mobile OS/browser may open that app.
   *
   * If the app is not installed or the browser
   * does not support the scheme, we fall back
   * to the standard UPI URI.
   */

  const appUris = {

    gpay:
      genericUpiUri.replace(
        "upi://pay?",
        "tez://upi/pay?"
      ),

    phonepe:
      genericUpiUri.replace(
        "upi://pay?",
        "phonepe://pay?"
      ),

    cred:
      genericUpiUri.replace(
        "upi://pay?",
        "cred://upi/pay?"
      ),

    bhim:
      genericUpiUri.replace(
        "upi://pay?",
        "bhim://upi/pay?"
      ),

    paytm:
      genericUpiUri.replace(
        "upi://pay?",
        "paytmmp://pay?"
      )
  };


  const appUri =
    appUris[appName];


  if (!appUri) {

    window.location.href =
      genericUpiUri;

    return;
  }


  /*
   * Try the requested UPI application first.
   *
   * If the app cannot handle the URI,
   * the fallback opens the normal UPI URI.
   */

  let fallbackTimer = null;


  const clearFallback = () => {

    if (fallbackTimer) {

      clearTimeout(
        fallbackTimer
      );

      fallbackTimer = null;
    }
  };


  const handleVisibility = () => {

    if (
      document.visibilityState ===
      "hidden"
    ) {

      clearFallback();
    }

  };


  document.addEventListener(
    "visibilitychange",
    handleVisibility,
    {
      once: true
    }
  );


  fallbackTimer =
    setTimeout(
      () => {

        if (
          document.visibilityState !==
          "hidden"
        ) {

          window.location.href =
            genericUpiUri;
        }


        clearFallback();

      },
      1500
    );


  window.location.href =
    appUri;

}


/* ========================================================================
   ORDER REVIEW
   ======================================================================== */

function renderOrderReview() {

  const container =
    document.getElementById(
      "order-review-items"
    );


  container.innerHTML =
    cartItems
      .map(
        (item) => `

          <div class="order-review-item">

            <span>
              ${escapeHtml(item.name)}
              × ${item.quantity}
            </span>

            <span>
              ${formatCurrency(
                item.price *
                item.quantity
              )}
            </span>

          </div>

        `
      )
      .join("");


  const subtotal =
    calculateSubtotal(
      cartItems
    );


  const delivery =
    calculateDeliveryCharge(
      subtotal
    );


  const total =
    subtotal + delivery;


  document.getElementById(
    "checkout-subtotal"
  ).textContent =
    formatCurrency(
      subtotal
    );


  document.getElementById(
    "checkout-delivery"
  ).textContent =
    delivery === 0
      ? "FREE"
      : formatCurrency(
          delivery
        );


  document.getElementById(
    "checkout-total"
  ).textContent =
    formatCurrency(
      total
    );
}


/* ========================================================================
   PLACE ORDER
   ======================================================================== */

document
  .getElementById("place-order-btn")
  .addEventListener(
    "click",
    async (event) => {

      const btn =
        event.currentTarget;


      if (
        !profile.name ||
        !profile.mobile ||
        !profile.address ||
        !profile.city
      ) {

        showError(
          "Please complete your delivery information before placing the order."
        );

        return;
      }


      if (
        cartItems.length === 0
      ) {

        showError(
          "Your cart is empty."
        );

        return;
      }


      const restore =
        setButtonLoading(
          btn,
          "Placing order..."
        );


      try {

        const strategy =
          getPaymentStrategy(
            selectedPaymentMethod
          );


        const subtotal =
          calculateSubtotal(
            cartItems
          );


        const deliveryCharge =
          calculateDeliveryCharge(
            subtotal
          );


        const totalAmount =
          subtotal +
          deliveryCharge;


        /*
         * Existing payment strategy flow
         * remains unchanged.
         */

        const initiation =
          await strategy.initiate();


        if (!initiation.success) {

          showError(
            initiation.message ||
            "Payment could not be initiated."
          );


          restore();

          return;
        }


        const order =
          await createOrder({

            userId:
              user.uid,

            customer: {

              name:
                profile.name,

              email:
                profile.email ||
                user.email,

              mobile:
                profile.mobile,

              address:
                profile.address,

              landmark:
                profile.landmark,

              city:
                profile.city
            },


            items:
              cartItems.map(
                (item) => ({

                  dishId:
                    item.dishId,

                  name:
                    item.name,

                  price:
                    item.price,

                  quantity:
                    item.quantity

                })
              ),


            subtotal,

            deliveryCharge,

            totalAmount,

            paymentMethod:
              strategy.key,

            paymentStatus:
              strategy
                .getInitialPaymentStatus()

          });


        await clearCart(
          user.uid
        );


        showSuccess(
          "Order placed successfully!"
        );


        window.location.href =
          `order-details.html?orderId=${encodeURIComponent(
            order.orderId
          )}`;


      } catch (error) {

        console.error(
          "PLACE ORDER ERROR:",
          error
        );

        console.error(
          "ERROR CODE:",
          error?.code
        );

        console.error(
          "ERROR MESSAGE:",
          error?.message
        );


        showError(
          error?.message ||
          "We couldn't place your order. Please try again."
        );


        restore();

      }

    }
  );


/* ========================================================================
   START
   ======================================================================== */

init();