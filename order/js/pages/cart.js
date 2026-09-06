import { requireAuth } from "../auth-guard.js";
import { renderNav } from "../nav.js";
import {
  getCart,
  updateQuantity,
  removeFromCart,
  calculateSubtotal,
  calculateDeliveryCharge,
  calculateItemCount,
} from "../cart-service.js";
import { APP_CONFIG } from "../config.js";
import { formatCurrency, escapeHtml, showError, showSuccess, renderEmpty, updateCartBadge } from "../ui.js";

const user = await requireAuth();
renderNav("cart");

const layoutEl = document.getElementById("cart-layout");
const itemsCardEl = document.getElementById("cart-items-card");
const emptyStateEl = document.getElementById("cart-empty-state");
const checkoutBtn = document.getElementById("checkout-btn");

async function loadCart() {
  try {
    const items = await getCart(user.uid);
    updateCartBadge(calculateItemCount(items));

    if (items.length === 0) {
      layoutEl.style.display = "none";
      renderEmpty(emptyStateEl, "Your cart is empty. Explore the menu to add something delicious!", "🛒");
      return;
    }

    layoutEl.style.display = "grid";
    emptyStateEl.innerHTML = "";
    renderItems(items);
    renderSummary(items);
  } catch (error) {
    layoutEl.style.display = "none";
    emptyStateEl.innerHTML = `<div class="state-panel state-panel--error"><div class="state-panel__icon">⚠️</div><p>We couldn't load your cart right now.</p></div>`;
  }
}

function renderItems(items) {
  itemsCardEl.innerHTML = items
    .map(
      (item) => `
      <div class="cart-item" data-dish-id="${escapeHtml(item.dishId)}">
        <img class="cart-item__image" src="${escapeHtml(item.image || "")}" alt="${escapeHtml(item.name)}" />
        <div class="cart-item__body">
          <div class="cart-item__name">${escapeHtml(item.name)}</div>
          <div class="cart-item__price">${formatCurrency(item.price)} each</div>
          <div class="qty-stepper" style="margin-top: 8px;">
            <button type="button" class="qty-decrease" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button type="button" class="qty-increase" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="cart-item__line-total">${formatCurrency(item.price * item.quantity)}</div>
        <button type="button" class="cart-item__remove" aria-label="Remove item">✕</button>
      </div>`
    )
    .join("");

  itemsCardEl.querySelectorAll(".cart-item").forEach((row) => {
    const dishId = row.dataset.dishId;
    row.querySelector(".qty-increase").addEventListener("click", () => changeQuantity(dishId, 1));
    row.querySelector(".qty-decrease").addEventListener("click", () => changeQuantity(dishId, -1));
    row.querySelector(".cart-item__remove").addEventListener("click", () => removeItem(dishId));
  });
}

function renderSummary(items) {
  const subtotal = calculateSubtotal(items);
  const delivery = calculateDeliveryCharge(subtotal);
  const total = subtotal + delivery;

  document.getElementById("summary-subtotal").textContent = formatCurrency(subtotal);
  document.getElementById("summary-delivery").textContent = delivery === 0 ? "FREE" : formatCurrency(delivery);
  document.getElementById("summary-total").textContent = formatCurrency(total);

  const noteEl = document.getElementById("free-delivery-note");
  if (APP_CONFIG.freeDeliveryThreshold > 0 && subtotal < APP_CONFIG.freeDeliveryThreshold && subtotal > 0) {
    const remaining = APP_CONFIG.freeDeliveryThreshold - subtotal;
    noteEl.innerHTML = `<div class="free-delivery-note">Add ${formatCurrency(remaining)} more for free delivery!</div>`;
  } else {
    noteEl.innerHTML = "";
  }
}

async function changeQuantity(dishId, delta) {
  try {
    const items = await getCart(user.uid);
    const current = items.find((i) => i.dishId === dishId);
    if (!current) return;
    await updateQuantity(user.uid, dishId, current.quantity + delta);
    loadCart();
  } catch (error) {
    showError("Couldn't update quantity. Please try again.");
  }
}

async function removeItem(dishId) {
  try {
    await removeFromCart(user.uid, dishId);
    showSuccess("Item removed from cart.");
    loadCart();
  } catch (error) {
    showError("Couldn't remove item. Please try again.");
  }
}

checkoutBtn.addEventListener("click", () => {
  window.location.href = "checkout.html";
});

loadCart();
