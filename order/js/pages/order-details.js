import { requireAuth } from "../auth-guard.js";
import { renderNav } from "../nav.js";
import { getOrderById } from "../order-service.js";
import { getCart, calculateItemCount } from "../cart-service.js";
import { ORDER_STATUS, ORDER_STATUS_STEPS } from "../config.js";
import { formatCurrency, formatDate, escapeHtml, renderLoading, updateCartBadge } from "../ui.js";

const user = await requireAuth();
renderNav("orders");

const contentEl = document.getElementById("order-details-content");

function getOrderIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("orderId");
}

function renderNotFound(message) {
  contentEl.innerHTML = `
    <div class="state-panel state-panel--empty">
      <div class="state-panel__icon">📦</div>
      <p>${escapeHtml(message)}</p>
      <a class="btn btn--primary" href="orders.html">Back to My Orders</a>
    </div>`;
}

function renderStatusTracker(order) {
  if (order.orderStatus === ORDER_STATUS.CANCELLED) {
    return `
      <div class="status-tracker status-tracker--cancelled">
        <div class="status-step status-step--current">
          <div class="status-step__dot">✕</div>
          <div class="status-step__label">Cancelled</div>
        </div>
      </div>`;
  }

  const currentIndex = ORDER_STATUS_STEPS.indexOf(order.orderStatus);

  return `
    <div class="status-tracker">
      ${ORDER_STATUS_STEPS.map((step, index) => {
        let stateClass = "";
        let dotContent = String(index + 1);
        if (index < currentIndex) {
          stateClass = "status-step--done";
          dotContent = "✓";
        } else if (index === currentIndex) {
          stateClass = "status-step--current";
          dotContent = "●";
        }
        return `
          <div class="status-step ${stateClass}">
            <div class="status-step__line"></div>
            <div class="status-step__dot">${dotContent}</div>
            <div class="status-step__label">${escapeHtml(step)}</div>
          </div>`;
      }).join("")}
    </div>`;
}

async function loadOrderDetails() {
  const orderId = getOrderIdFromUrl();
  if (!orderId) {
    renderNotFound("No order details found.");
    return;
  }

  renderLoading(contentEl, "Loading order details...");

  try {
    const [order, cartItems] = await Promise.all([getOrderById(orderId), getCart(user.uid)]);
    updateCartBadge(calculateItemCount(cartItems));

    if (!order || order.userId !== user.uid) {
      renderNotFound("No order details found.");
      return;
    }

    contentEl.innerHTML = `
      <div class="card card--padded" style="margin-bottom: var(--space-4);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap: var(--space-2);">
          <h2 style="font-size:1.1rem;">Order #${escapeHtml(order.orderId)}</h2>
          <span style="color: var(--color-text-muted); font-size: 0.85rem;">${formatDate(order.createdAt)}</span>
        </div>
        ${renderStatusTracker(order)}
      </div>

      <div class="card card--padded" style="margin-bottom: var(--space-4);">
        <h3 style="font-size:1rem; margin-bottom: var(--space-3);">Delivery Information</h3>
        <dl class="order-info-grid">
          <div><dt>Name</dt><dd>${escapeHtml(order.customerName)}</dd></div>
          <div><dt>Mobile</dt><dd>${escapeHtml(order.mobile)}</dd></div>
          <div style="grid-column: 1 / -1;"><dt>Address</dt><dd>${escapeHtml(order.address)}${order.landmark ? ", " + escapeHtml(order.landmark) : ""}, ${escapeHtml(order.city)}</dd></div>
        </dl>
      </div>

      <div class="card card--padded" style="margin-bottom: var(--space-4);">
        <h3 style="font-size:1rem; margin-bottom: var(--space-3);">Items</h3>
        ${order.items
          .map(
            (item) => `
          <div class="order-details-item">
            <span>${escapeHtml(item.name)} × ${item.quantity}</span>
            <span>${formatCurrency(item.price * item.quantity)}</span>
          </div>`
          )
          .join("")}
        <div class="order-details-item"><span>Subtotal</span><span>${formatCurrency(order.subtotal)}</span></div>
        <div class="order-details-item"><span>Delivery Charge</span><span>${order.deliveryCharge === 0 ? "FREE" : formatCurrency(order.deliveryCharge)}</span></div>
        <div class="order-details-item" style="font-weight:800;"><span>Total Amount</span><span>${formatCurrency(order.totalAmount)}</span></div>
      </div>

      <div class="card card--padded">
        <h3 style="font-size:1rem; margin-bottom: var(--space-3);">Payment</h3>
        <dl class="order-info-grid">
          <div><dt>Method</dt><dd>${escapeHtml(order.paymentMethod)}</dd></div>
          <div><dt>Status</dt><dd>${escapeHtml(order.paymentStatus)}</dd></div>
        </dl>
      </div>`;
  } catch (error) {
    renderNotFound("We couldn't load this order. Please try again from My Orders.");
  }
}

loadOrderDetails();
