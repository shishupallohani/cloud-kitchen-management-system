import { requireAuth } from "../auth-guard.js";
import { renderNav } from "../nav.js";
import { getOrdersByUser } from "../order-service.js";
import { getCart, calculateItemCount } from "../cart-service.js";
import { ORDER_STATUS, PAYMENT_STATUS } from "../config.js";
import {
  formatCurrency,
  formatDate,
  escapeHtml,
  renderLoading,
  renderEmpty,
  renderErrorState,
  updateCartBadge,
} from "../ui.js";

const user = await requireAuth();
renderNav("orders");

const contentEl = document.getElementById("orders-content");

function statusBadgeClass(status) {
  const map = {
    [ORDER_STATUS.PENDING]: "badge--pending",
    [ORDER_STATUS.CONFIRMED]: "badge--confirmed",
    [ORDER_STATUS.PREPARING]: "badge--preparing",
    [ORDER_STATUS.READY]: "badge--ready",
    [ORDER_STATUS.DELIVERED]: "badge--delivered",
    [ORDER_STATUS.CANCELLED]: "badge--cancelled",
  };
  return map[status] || "badge--pending";
}

function paymentBadgeClass(status) {
  const map = {
    [PAYMENT_STATUS.PAID]: "badge--paid",
    [PAYMENT_STATUS.AWAITING_CONFIRMATION]: "badge--awaiting",
    [PAYMENT_STATUS.PENDING]: "badge--awaiting",
    [PAYMENT_STATUS.FAILED]: "badge--failed-pay",
  };
  return map[status] || "badge--awaiting";
}

async function loadOrders() {
  renderLoading(contentEl, "Loading your orders...");
  try {
    const [orders, cartItems] = await Promise.all([getOrdersByUser(user.uid), getCart(user.uid)]);
    updateCartBadge(calculateItemCount(cartItems));

    if (orders.length === 0) {
      renderEmpty(contentEl, "You haven't placed any orders yet.", "📦");
      return;
    }

    contentEl.innerHTML = orders
      .map(
        (order) => `
        <div class="card order-card">
          <div class="order-card__top">
            <div>
              <div class="order-card__id">Order #${escapeHtml(order.orderId)}</div>
              <div class="order-card__date">${formatDate(order.createdAt)}</div>
            </div>
            <div class="order-card__badges">
              <span class="badge ${statusBadgeClass(order.orderStatus)}">${escapeHtml(order.orderStatus)}</span>
              <span class="badge ${paymentBadgeClass(order.paymentStatus)}">${escapeHtml(order.paymentStatus)}</span>
            </div>
          </div>
          <div class="order-card__meta">
            <div>
              <span style="color: var(--color-text-muted); font-size: 0.85rem;">${escapeHtml(order.paymentMethod)} · ${order.items.length} item(s)</span>
            </div>
            <div style="display:flex; align-items:center; gap: var(--space-4);">
              <span class="order-card__total">${formatCurrency(order.totalAmount)}</span>
              <a class="btn btn--secondary btn--sm" href="order-details.html?orderId=${encodeURIComponent(order.orderId)}">View Details</a>
            </div>
          </div>
        </div>`
      )
      .join("");
  } catch (error) {
    renderErrorState(contentEl, "We couldn't load your orders right now.", loadOrders);
  }
}

loadOrders();
