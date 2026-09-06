import { requireAuth } from "../auth-guard.js";
import { renderNav } from "../nav.js";
import { getUserProfile } from "../user-service.js";
import { saveProfile } from "../profile-service.js";
import { getCart, calculateSubtotal, calculateDeliveryCharge, clearCart, calculateItemCount } from "../cart-service.js";
import { getAvailablePaymentMethods, getPaymentStrategy } from "../payment-service.js";
import { createOrder } from "../order-service.js";
import { PAYMENT_METHOD, APP_CONFIG } from "../config.js";
import {
  formatCurrency,
  escapeHtml,
  showError,
  showSuccess,
  setButtonLoading,
  updateCartBadge,
} from "../ui.js";

const user = await requireAuth();
renderNav("cart");

const loadingEl = document.getElementById("checkout-loading");
const layoutEl = document.getElementById("checkout-layout");

let profile = null;
let cartItems = [];
let selectedPaymentMethod = PAYMENT_METHOD.COD;

async function init() {
  try {
    const [profileResult, items] = await Promise.all([getUserProfile(user.uid), getCart(user.uid)]);
    profile = profileResult || { name: "", mobile: "", address: "", landmark: "", city: "", email: user.email };
    cartItems = items;
    updateCartBadge(calculateItemCount(items));

    if (cartItems.length === 0) {
      loadingEl.innerHTML = `<div class="state-panel state-panel--empty"><div class="state-panel__icon">🛒</div><p>Your cart is empty. Add items before checking out.</p></div>`;
      return;
    }

    loadingEl.style.display = "none";
    layoutEl.style.display = "grid";

    renderDeliveryView();
    renderPaymentOptions();
    renderOrderReview();
  } catch (error) {
    loadingEl.innerHTML = `<div class="state-panel state-panel--error"><div class="state-panel__icon">⚠️</div><p>We couldn't load checkout. Please refresh the page.</p></div>`;
  }
}

/* ---------------------------- Delivery info ---------------------------- */

function renderDeliveryView() {
  const viewEl = document.getElementById("delivery-info-view");
  viewEl.innerHTML = `
    <p><strong>${escapeHtml(profile.name || "—")}</strong></p>
    <p>${escapeHtml(profile.mobile || "—")}</p>
    <p>${escapeHtml(profile.address || "—")}${profile.landmark ? ", " + escapeHtml(profile.landmark) : ""}</p>
    <p>${escapeHtml(profile.city || "—")}</p>`;
}

document.getElementById("edit-delivery-btn").addEventListener("click", () => {
  const formEl = document.getElementById("delivery-info-form");
  const viewEl = document.getElementById("delivery-info-view");
  document.getElementById("checkout-name").value = profile.name || "";
  document.getElementById("checkout-mobile").value = profile.mobile || "";
  document.getElementById("checkout-address").value = profile.address || "";
  document.getElementById("checkout-landmark").value = profile.landmark || "";
  document.getElementById("checkout-city").value = profile.city || "";
  viewEl.style.display = "none";
  formEl.style.display = "block";
});

document.getElementById("save-delivery-btn").addEventListener("click", async (event) => {
  const btn = event.currentTarget;
  const updated = {
    name: document.getElementById("checkout-name").value,
    mobile: document.getElementById("checkout-mobile").value,
    address: document.getElementById("checkout-address").value,
    landmark: document.getElementById("checkout-landmark").value,
    city: document.getElementById("checkout-city").value,
  };

  const restore = setButtonLoading(btn, "Saving...");
  try {
    await saveProfile(user.uid, updated);
    profile = { ...profile, ...updated };
    renderDeliveryView();
    document.getElementById("delivery-info-form").style.display = "none";
    document.getElementById("delivery-info-view").style.display = "block";
    showSuccess("Delivery details updated.");
  } catch (error) {
    showError(error.message || "Couldn't save delivery details.");
  } finally {
    restore();
  }
});

/* ---------------------------- Payment method ---------------------------- */

function renderPaymentOptions() {
  const container = document.getElementById("payment-options");
  const methods = getAvailablePaymentMethods();

  container.innerHTML = methods
    .map(
      (method, index) => `
      <label class="payment-option${index === 0 ? " payment-option--selected" : ""}" data-method="${method.key}">
        <input type="radio" name="payment-method" value="${method.key}" ${index === 0 ? "checked" : ""} />
        <div>
          <div class="payment-option__label">${escapeHtml(method.label)}</div>
          <div class="payment-option__desc">${
            method.key === PAYMENT_METHOD.COD
              ? "Pay in cash when your order arrives."
              : "Scan the QR code with any UPI app to pay now."
          }</div>
        </div>
      </label>`
    )
    .join("");

  container.querySelectorAll('input[name="payment-method"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      selectedPaymentMethod = radio.value;
      container.querySelectorAll(".payment-option").forEach((el) => {
        el.classList.toggle("payment-option--selected", el.dataset.method === selectedPaymentMethod);
      });
      toggleUpiPanel();
    });
  });

  toggleUpiPanel();
}

function toggleUpiPanel() {
  const panel = document.getElementById("upi-panel");
  if (selectedPaymentMethod === PAYMENT_METHOD.UPI) {
    document.getElementById("upi-qr-image").src = APP_CONFIG.upi.qrImagePath;
    document.getElementById("upi-id-text").textContent = `UPI ID: ${APP_CONFIG.upi.upiId}`;
    panel.classList.add("upi-panel--visible");
  } else {
    panel.classList.remove("upi-panel--visible");
  }
}

/* ---------------------------- Order review ---------------------------- */

function renderOrderReview() {
  const container = document.getElementById("order-review-items");
  container.innerHTML = cartItems
    .map(
      (item) => `
      <div class="order-review-item">
        <span>${escapeHtml(item.name)} × ${item.quantity}</span>
        <span>${formatCurrency(item.price * item.quantity)}</span>
      </div>`
    )
    .join("");

  const subtotal = calculateSubtotal(cartItems);
  const delivery = calculateDeliveryCharge(subtotal);
  const total = subtotal + delivery;

  document.getElementById("checkout-subtotal").textContent = formatCurrency(subtotal);
  document.getElementById("checkout-delivery").textContent = delivery === 0 ? "FREE" : formatCurrency(delivery);
  document.getElementById("checkout-total").textContent = formatCurrency(total);
}

/* ---------------------------- Place order ---------------------------- */

document.getElementById("place-order-btn").addEventListener("click", async (event) => {
  const btn = event.currentTarget;

  if (!profile.name || !profile.mobile || !profile.address || !profile.city) {
    showError("Please complete your delivery information before placing the order.");
    return;
  }

  if (cartItems.length === 0) {
    showError("Your cart is empty.");
    return;
  }

  const restore = setButtonLoading(btn, "Placing order...");

  try {
    const strategy = getPaymentStrategy(selectedPaymentMethod);
    const subtotal = calculateSubtotal(cartItems);
    const deliveryCharge = calculateDeliveryCharge(subtotal);
    const totalAmount = subtotal + deliveryCharge;

    const initiation = await strategy.initiate();
    if (!initiation.success) {
      showError(initiation.message || "Payment could not be initiated.");
      restore();
      return;
    }

    const order = await createOrder({
      userId: user.uid,
      customer: {
        name: profile.name,
        email: profile.email || user.email,
        mobile: profile.mobile,
        address: profile.address,
        landmark: profile.landmark,
        city: profile.city,
      },
      items: cartItems.map((item) => ({
        dishId: item.dishId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      subtotal,
      deliveryCharge,
      totalAmount,
      paymentMethod: strategy.key,
      paymentStatus: strategy.getInitialPaymentStatus(),
    });

    await clearCart(user.uid);
    showSuccess("Order placed successfully!");
    window.location.href = `order-details.html?orderId=${encodeURIComponent(order.orderId)}`;
  } catch (error) {
    showError("We couldn't place your order. Please try again.");
    restore();
  }
});

init();
