/**
 * ui.js
 * -----------------------------------------------------------------------
 * Small, dependency-free UI helpers shared across every page: toasts,
 * button loading states, currency formatting, empty-state rendering, and
 * a tiny HTML-escaping helper. Nothing here touches Firebase — this file
 * only ever manipulates the DOM.
 * -----------------------------------------------------------------------
 */

import { APP_CONFIG } from "./config.js";

/** Format a number as a currency string using the configured symbol. */
export function formatCurrency(amount) {
  const value = Number(amount) || 0;
  return `${APP_CONFIG.currencySymbol}${value.toFixed(2).replace(/\.00$/, "")}`;
}

/** Escape user-supplied text before inserting it into innerHTML. */
export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Lazily create (once) and return the toast container element. */
function getToastContainer() {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Show a toast message.
 * @param {string} message
 * @param {"success"|"error"|"info"} type
 */
export function showToast(message, type = "info") {
  const container = getToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Trigger enter animation on next frame.
  requestAnimationFrame(() => toast.classList.add("toast--visible"));

  setTimeout(() => {
    toast.classList.remove("toast--visible");
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

export function showError(message) {
  showToast(message, "error");
}

export function showSuccess(message) {
  showToast(message, "success");
}

/**
 * Put a button into a "loading" state (disabled + spinner + busy text) and
 * return a restore function that puts it back exactly as it was. Used to
 * prevent duplicate submissions on slow networks.
 */
export function setButtonLoading(button, busyText) {
  if (!button || button.dataset.loading === "true") {
    return () => {};
  }
  button.dataset.loading = "true";
  button.dataset.originalText = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span>${escapeHtml(busyText)}`;

  return function restore() {
    button.disabled = false;
    button.innerHTML = button.dataset.originalText || busyText;
    delete button.dataset.loading;
    delete button.dataset.originalText;
  };
}

/** Render a full-panel loading state inside a container. */
export function renderLoading(container, text = "Loading...") {
  container.innerHTML = `
    <div class="state-panel state-panel--loading">
      <span class="spinner" aria-hidden="true"></span>
      <p>${escapeHtml(text)}</p>
    </div>`;
}

/** Render a full-panel empty state inside a container. */
export function renderEmpty(container, text, iconText = "🍽️") {
  container.innerHTML = `
    <div class="state-panel state-panel--empty">
      <div class="state-panel__icon" aria-hidden="true">${iconText}</div>
      <p>${escapeHtml(text)}</p>
    </div>`;
}

/** Render a full-panel error state inside a container, with optional retry. */
export function renderErrorState(container, text, onRetry) {
  container.innerHTML = `
    <div class="state-panel state-panel--error">
      <div class="state-panel__icon" aria-hidden="true">⚠️</div>
      <p>${escapeHtml(text)}</p>
      ${onRetry ? `<button type="button" class="btn btn--secondary" id="state-retry-btn">Try Again</button>` : ""}
    </div>`;
  if (onRetry) {
    container.querySelector("#state-retry-btn")?.addEventListener("click", onRetry);
  }
}

/** Attach a field-level validation error message under an input. */
export function setFieldError(inputEl, message) {
  clearFieldError(inputEl);
  if (!message) return;
  inputEl.classList.add("input--invalid");
  const hint = document.createElement("p");
  hint.className = "field-error";
  hint.textContent = message;
  hint.dataset.fieldError = "true";
  inputEl.insertAdjacentElement("afterend", hint);
}

export function clearFieldError(inputEl) {
  inputEl.classList.remove("input--invalid");
  const next = inputEl.nextElementSibling;
  if (next && next.dataset && next.dataset.fieldError === "true") {
    next.remove();
  }
}

/** Format a Firestore Timestamp / Date / ISO-string into a readable date. */
export function formatDate(value) {
  let date;
  if (!value) return "";
  if (typeof value.toDate === "function") {
    date = value.toDate();
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Highlight the current page's link in the shared nav (data-nav-current attr). */
export function highlightActiveNav(pageKey) {
  document.querySelectorAll("[data-nav-link]").forEach((link) => {
    if (link.dataset.navLink === pageKey) {
      link.classList.add("nav-link--active");
    }
  });
}

/** Update the small cart-count badge in the nav, if present. */
export function updateCartBadge(count) {
  const badge = document.getElementById("nav-cart-badge");
  if (!badge) return;
  const n = Number(count) || 0;
  badge.textContent = String(n);
  badge.style.display = n > 0 ? "inline-flex" : "none";
}
