import { db } from "./firebase.js";
import { watchAuthState, logoutAdmin } from "./auth.js";
import {
  toDateKey,
  fetchMenuForDate,
  fetchMenusForRange,
  saveMenuForDate,
  deleteMenuForDate,
  duplicateMenu,
  formatDisplayDate,
  fetchCurrentMenu,
  saveCurrentMenu,
} from "./menu.js";
import {
  THEME_PRESETS,
  getActiveSiteTheme,
  saveActiveSiteTheme,
  applySiteTheme,
} from "./site-theme.js";

import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  writeBatch,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ---------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------
const authGate = document.getElementById("auth-gate");
const adminApp = document.getElementById("admin-app");
const adminEmailEl = document.getElementById("admin-email");

watchAuthState((user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  authGate.hidden = true;
  adminApp.hidden = false;
  adminEmailEl.textContent = user.email || "";
  bootDashboard();
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await logoutAdmin();
  window.location.href = "login.html";
});

// ---------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------
document.querySelectorAll(".admin-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("is-active"));
    document.querySelectorAll(".admin-panel").forEach((p) => p.classList.remove("is-active"));
    tab.classList.add("is-active");
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add("is-active");
  });
});

// ---------------------------------------------------------------------
// Toasts — visible confirmation for every add/edit/remove/save action
// ---------------------------------------------------------------------
const toastContainer = document.getElementById("toast-container");

function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " toast--error" : ""}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast--leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, 3200);
}

// ---------------------------------------------------------------------
// Confirm dialog — replaces the native browser confirm() with a
// matching in-page card. Same behavior: resolves true only if the
// person clicks "Delete".
// ---------------------------------------------------------------------
const confirmOverlay = document.getElementById("confirm-modal");
const confirmMessageEl = document.getElementById("confirm-modal-message");
const confirmOkBtn = document.getElementById("confirm-modal-ok");
const confirmCancelBtn = document.getElementById("confirm-modal-cancel");

function confirmDialog(message) {
  confirmMessageEl.textContent = message;
  confirmOverlay.hidden = false;
  return new Promise((resolve) => {
    function settle(result) {
      confirmOverlay.hidden = true;
      confirmOkBtn.removeEventListener("click", onOk);
      confirmCancelBtn.removeEventListener("click", onCancel);
      confirmOverlay.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKeydown);
      resolve(result);
    }
    function onOk() { settle(true); }
    function onCancel() { settle(false); }
    function onBackdrop(e) { if (e.target === confirmOverlay) settle(false); }
    function onKeydown(e) { if (e.key === "Escape") settle(false); }
    confirmOkBtn.addEventListener("click", onOk);
    confirmCancelBtn.addEventListener("click", onCancel);
    confirmOverlay.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKeydown);
  });
}

let booted = false;
function bootDashboard() {
  if (booted) return;
  booted = true;
  initOverview();
  initLiveMenuEditor();
  initMenuEditor();
  initCustomers();
  initReviewStatus();
  initSiteThemeControl();
  initFestivalManagement();
}

// ---------------------------------------------------------------------
// Website Theme — sitewide colour controller
// ---------------------------------------------------------------------
async function initSiteThemeControl() {
  const swatchContainer = document.getElementById("theme-swatches");
  const statusEl = document.getElementById("theme-status");
  if (!swatchContainer) return;

  const activeKey = await getActiveSiteTheme();

  function render(selectedKey) {
    swatchContainer.innerHTML = Object.entries(THEME_PRESETS)
      .map(([key, preset]) => {
        const isActive = key === selectedKey;
        return `
          <button
            type="button"
            class="theme-swatch${isActive ? " is-active" : ""}"
            data-theme-key="${key}"
            style="--swatch-a: ${preset.bg}; --swatch-b: ${preset.gold}; --swatch-c: ${preset.bgLight};"
            aria-pressed="${isActive}"
          >
            <span class="theme-swatch__colors"></span>
            <span class="theme-swatch__label">${preset.label}</span>
          </button>`;
      })
      .join("");
  }

  render(activeKey);

  swatchContainer.addEventListener("click", async (e) => {
    const btn = e.target.closest(".theme-swatch");
    if (!btn) return;
    const key = btn.dataset.themeKey;

    statusEl.textContent = "Saving...";
    try {
      await saveActiveSiteTheme(key);
      applySiteTheme(key); // live preview inside the admin panel too
      render(key);
      statusEl.textContent = `Theme set to "${THEME_PRESETS[key].label}". Public site updates immediately.`;
    } catch (err) {
      console.error("Failed to save site theme:", err);
      statusEl.textContent = "Couldn't save the theme. Please try again.";
    }
  });
}

// ---------------------------------------------------------------------
// Live Thali — persistent, date-independent editor.
// Completely separate from the date-based Menu Management editor
// below: different DOM elements, different save target
// (fetchCurrentMenu / saveCurrentMenu instead of *ForDate).
// ---------------------------------------------------------------------
const liveItemsList = document.getElementById("live-menu-items-list");
const liveSpecialNoteInput = document.getElementById("live-special-note-input");
const liveStatusEl = document.getElementById("live-editor-status");

function setLiveStatus(message, isError = false) {
  liveStatusEl.textContent = message;
  liveStatusEl.classList.toggle("is-error", isError);
  if (message) {
    clearTimeout(setLiveStatus._t);
    setLiveStatus._t = setTimeout(() => (liveStatusEl.textContent = ""), 4000);
  }
}

function addLiveItemRow(item = {}) {
  const node = itemRowTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('[data-field="name"]').value = item.name || "";
  node.querySelector('[data-field="category"]').value = item.category || "";
  node.querySelector('[data-field="description"]').value = item.description || "";
  node.querySelector('[data-field="imageUrl"]').value = item.imageUrl || "";
  node.querySelector('[data-field="price"]').value = item.price ?? "";
  node.querySelector('[data-field="available"]').checked = item.available !== false;

  node.querySelector('[data-action="remove"]').addEventListener("click", () => {
    const name = node.querySelector('[data-field="name"]').value || "Item";
    node.remove();
    showToast(`${name} removed. Click Save Live Thali to make it permanent.`);
  });
  node.querySelector('[data-action="move-up"]').addEventListener("click", () => {
    const prev = node.previousElementSibling;
    if (prev) {
      liveItemsList.insertBefore(node, prev);
      showToast("Moved up.");
    }
  });
  node.querySelector('[data-action="move-down"]').addEventListener("click", () => {
    const next = node.nextElementSibling;
    if (next) {
      liveItemsList.insertBefore(next, node);
      showToast("Moved down.");
    }
  });

  liveItemsList.appendChild(node);
}

function readLiveItemsFromEditor() {
  return Array.from(liveItemsList.children).map((row) => {
    const val = (field) => row.querySelector(`[data-field="${field}"]`).value;
    const priceVal = val("price");
    return {
      name: val("name").trim(),
      category: val("category").trim(),
      description: val("description").trim(),
      imageUrl: val("imageUrl").trim(),
      price: priceVal ? Number(priceVal) : null,
      available: row.querySelector('[data-field="available"]').checked,
    };
  }).filter((item) => item.name);
}

async function initLiveMenuEditor() {
  liveItemsList.innerHTML = "";
  liveSpecialNoteInput.value = "";
  const menu = await fetchCurrentMenu();
  if (menu) {
    liveSpecialNoteInput.value = menu.specialNote || "";
    (menu.items || [])
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach(addLiveItemRow);
    setLiveStatus(`Loaded live thali (${menu.items?.length || 0} items).`);
  } else {
    setLiveStatus("No live thali set yet — add items and save.");
  }

  document.getElementById("live-add-item-btn").addEventListener("click", () => {
    addLiveItemRow();
    showToast("New item row added — fill it in and click Save Live Thali.");
  });

  document.getElementById("live-save-menu-btn").addEventListener("click", async () => {
    const items = readLiveItemsFromEditor();
    try {
      await saveCurrentMenu({ items, specialNote: liveSpecialNoteInput.value.trim() });
      setLiveStatus(`Saved live thali (${items.length} item(s)).`);
      showToast(`Live thali saved (${items.length} item(s)). Previous one is now replaced.`);
    } catch (err) {
      console.error(err);
      setLiveStatus("Couldn't save the live thali. Please try again.", true);
      showToast("Couldn't save the live thali. Please try again.", true);
    }
  });
}

// ---------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------
async function initOverview() {
  const todayKey = toDateKey();

  document.getElementById("overview-today-date").textContent =
    formatDisplayDate(todayKey);

  const [todayMenu, range] = await Promise.all([
    fetchMenuForDate(todayKey),
    fetchMenusForRange(todayKey, 7),
  ]);

  document.getElementById("overview-today-count").textContent = todayMenu
    ? `${(todayMenu.items || []).length} item(s) on today's menu`
    : "No menu configured for today yet";

  const list = document.getElementById("upcoming-list");

  list.innerHTML = range
    .map(({ date, menu }) => {
      const count = menu ? (menu.items || []).length : 0;

      return `
        <li class="upcoming-list__row">
          <span>${formatDisplayDate(date)}</span>
          <span class="${menu ? "is-ok" : "is-empty"}">
            ${menu ? `${count} item(s) configured` : "Not configured"}
          </span>
        </li>`;
    })
    .join("");
}
// ---------------------------------------------------------------------
// Menu Management
// ---------------------------------------------------------------------
const dateInput = document.getElementById("menu-date-input");
const duplicateTargetInput = document.getElementById("duplicate-target-input");
const itemsList = document.getElementById("menu-items-list");
const specialNoteInput = document.getElementById("special-note-input");
const statusEl = document.getElementById("menu-editor-status");
const itemRowTemplate = document.getElementById("menu-item-row-template");

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("is-error", isError);
  if (message) {
    clearTimeout(setStatus._t);
    setStatus._t = setTimeout(() => (statusEl.textContent = ""), 4000);
  }
}

function addItemRow(item = {}) {
  const node = itemRowTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('[data-field="name"]').value = item.name || "";
  node.querySelector('[data-field="category"]').value = item.category || "";
  node.querySelector('[data-field="description"]').value = item.description || "";
  node.querySelector('[data-field="imageUrl"]').value = item.imageUrl || "";
  node.querySelector('[data-field="price"]').value = item.price ?? "";
  node.querySelector('[data-field="available"]').checked = item.available !== false;

  node.querySelector('[data-action="remove"]').addEventListener("click", () => {
    const name = node.querySelector('[data-field="name"]').value || "Item";
    node.remove();
    showToast(`${name} removed from this menu. Click Save Menu to make it permanent.`);
  });
  node.querySelector('[data-action="move-up"]').addEventListener("click", () => {
    const prev = node.previousElementSibling;
    if (prev) {
      itemsList.insertBefore(node, prev);
      showToast("Moved up.");
    }
  });
  node.querySelector('[data-action="move-down"]').addEventListener("click", () => {
    const next = node.nextElementSibling;
    if (next) {
      itemsList.insertBefore(next, node);
      showToast("Moved down.");
    }
  });

  itemsList.appendChild(node);
}

function readItemsFromEditor() {
  return Array.from(itemsList.children).map((row) => {
    const val = (field) => row.querySelector(`[data-field="${field}"]`).value;
    const priceVal = val("price");
    return {
      name: val("name").trim(),
      category: val("category").trim(),
      description: val("description").trim(),
      imageUrl: val("imageUrl").trim(),
      price: priceVal ? Number(priceVal) : null,
      available: row.querySelector('[data-field="available"]').checked,
    };
  }).filter((item) => item.name);
}

async function loadMenuIntoEditor(dateKey) {
  itemsList.innerHTML = "";
  specialNoteInput.value = "";
  const menu = await fetchMenuForDate(dateKey);
  if (menu) {
    specialNoteInput.value = menu.specialNote || "";
    (menu.items || [])
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach(addItemRow);
    setStatus(`Loaded menu for ${formatDisplayDate(dateKey)} (${menu.items?.length || 0} items).`);
  } else {
    setStatus(`No menu found for ${formatDisplayDate(dateKey)} yet — add items and save.`);
  }
}

function initMenuEditor() {
  const todayKey = toDateKey();
  dateInput.value = todayKey;
  loadMenuIntoEditor(todayKey);

  document.getElementById("load-menu-btn").addEventListener("click", () => {
    if (!dateInput.value) return;
    loadMenuIntoEditor(dateInput.value);
  });

  document.getElementById("add-item-btn").addEventListener("click", () => {
    addItemRow();
    showToast("New item row added — fill it in and click Save Menu.");
  });

  document.getElementById("save-menu-btn").addEventListener("click", async () => {
    if (!dateInput.value) {
      setStatus("Pick a date first.", true);
      return showToast("Pick a date first.", true);
    }
    const items = readItemsFromEditor();
    try {
      await saveMenuForDate(dateInput.value, { items, specialNote: specialNoteInput.value.trim() });
      setStatus(`Saved menu for ${formatDisplayDate(dateInput.value)}.`);
      showToast(`Menu saved for ${formatDisplayDate(dateInput.value)} (${items.length} item(s)).`);
      initOverview();
    } catch (err) {
      console.error(err);
      setStatus("Couldn't save the menu. Please try again.", true);
      showToast("Couldn't save the menu. Please try again.", true);
    }
  });

  document.getElementById("delete-menu-btn").addEventListener("click", async () => {
    if (!dateInput.value) return;
    const ok = await confirmDialog(`Delete the menu for ${formatDisplayDate(dateInput.value)}? This can't be undone.`);
    if (!ok) return;
    try {
      await deleteMenuForDate(dateInput.value);
      itemsList.innerHTML = "";
      specialNoteInput.value = "";
      setStatus(`Deleted menu for ${formatDisplayDate(dateInput.value)}.`);
      showToast(`Menu deleted for ${formatDisplayDate(dateInput.value)}.`);
      initOverview();
    } catch (err) {
      console.error(err);
      setStatus("Couldn't delete the menu.", true);
      showToast("Couldn't delete the menu.", true);
    }
  });

  document.getElementById("duplicate-menu-btn").addEventListener("click", async () => {
    if (!dateInput.value || !duplicateTargetInput.value) {
      setStatus("Pick both a source date and a target date.", true);
      return showToast("Pick both a source date and a target date.", true);
    }
    try {
      await duplicateMenu(dateInput.value, duplicateTargetInput.value);
      const msg = `Copied ${formatDisplayDate(dateInput.value)} → ${formatDisplayDate(duplicateTargetInput.value)}.`;
      setStatus(msg);
      showToast(msg);
      initOverview();
    } catch (err) {
      console.error(err);
      const msg = err.message || "Couldn't duplicate the menu.";
      setStatus(msg, true);
      showToast(msg, true);
    }
  });
}

// ---------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------
const customersList = document.getElementById("customers-list");

async function initCustomers() {
  customersList.innerHTML = "<p>Loading customers...</p>";

  try {
    const snapshot = await getDocs(collection(db, "customers"));

    if (snapshot.empty) {
      customersList.innerHTML =
        '<p class="customers-empty">No registered customers found.</p>';
      return;
    }

    customersList.innerHTML = "";

    snapshot.forEach((customerDoc) => {
      const customer = customerDoc.data();

      const row = document.createElement("div");
      row.className = "customer-row";

      row.innerHTML = `
        <div class="customer-cell customer-cell--name">
          <strong>${customer.name || "N/A"}</strong>
        </div>

        <div class="customer-cell">
          ${customer.mobile || customerDoc.id}
        </div>

        <div class="customer-cell customer-cell--address">
          ${customer.address || "N/A"}
        </div>

        <div class="customer-cell customer-cell--rating">
          ${customer.rating ? `⭐ ${customer.rating}/5` : "—"}
        </div>

        <div class="customer-cell customer-cell--review">
          ${customer.review || "—"}
        </div>

        <div class="customer-cell customer-cell--action">
          <button
            type="button"
            class="btn btn--ghost btn--small btn--danger"
            data-action="delete-customer">
            Delete
          </button>
        </div>
      `;

      row
        .querySelector('[data-action="delete-customer"]')
        .addEventListener("click", async () => {

          const mobile = customer.mobile || customerDoc.id;

          const ok = await confirmDialog(
            `Delete customer ${mobile}? This can't be undone.`
          );

          if (!ok) return;

          try {
            await deleteDoc(
              doc(db, "customers", customerDoc.id)
            );

            row.remove();

            showToast(
              `Customer ${mobile} deleted permanently.`
            );

            if (!customersList.children.length) {
              customersList.innerHTML =
                '<p class="customers-empty">No registered customers found.</p>';
            }

          } catch (err) {
            console.error(err);
            showToast(
              "Couldn't delete customer.",
              true
            );
          }
        });

      customersList.appendChild(row);
    });

  } catch (err) {
    console.error(err);

    customersList.innerHTML =
      '<p class="customers-empty">Couldn\'t load customers. Please try again.</p>';

    showToast(
      "Couldn't load customers.",
      true
    );
  }
}

// ---------------------------------------------------------------------
// Review Status
// ---------------------------------------------------------------------
const reviewStatusList = document.getElementById("review-status-list");

async function initReviewStatus() {
  reviewStatusList.innerHTML = "<p>Loading reviews...</p>";

  try {
    const snapshot = await getDocs(
      collection(db, "reviewStatus")
    );

    if (snapshot.empty) {
      reviewStatusList.innerHTML =
        '<p class="review-status-empty">No pending reviews.</p>';
      return;
    }

    reviewStatusList.innerHTML = "";

    for (const reviewDoc of snapshot.docs) {

      const review = reviewDoc.data();

      const row = document.createElement("div");
      row.className = "review-status-row";

      row.innerHTML = `
        <div class="review-status-cell">
          ${review.name || "Customer Review"}
        </div>

        <div class="review-status-cell review-status-cell--rating">
          ⭐ ${review.rating || "N/A"}/5
        </div>

        <div class="review-status-cell review-status-cell--review">
          ${review.review || "N/A"}
        </div>

        <div class="review-status-cell review-status-cell--action">

          <button
            type="button"
            class="btn btn--small"
            data-action="approve-review">
            Approve
          </button>

          <button
            type="button"
            class="btn btn--ghost btn--small btn--danger"
            data-action="reject-review">
            Reject
          </button>

        </div>
      `;

      // ---------------------------------------------------------------
      // Approve
      // ---------------------------------------------------------------
      row
        .querySelector('[data-action="approve-review"]')
        .addEventListener("click", () => {
          openCustomerSelection(
            reviewDoc.id,
            review.rating,
            review.review
          );
        });

      // ---------------------------------------------------------------
      // Reject
      // ---------------------------------------------------------------
      row
        .querySelector('[data-action="reject-review"]')
        .addEventListener("click", async () => {

          const ok = await confirmDialog(
            "Reject this review? This cannot be undone."
          );

          if (!ok) return;

          try {

            await deleteDoc(
              doc(db, "reviewStatus", reviewDoc.id)
            );

            row.remove();

            showToast("Review rejected.");

            if (!reviewStatusList.children.length) {
              reviewStatusList.innerHTML =
                '<p class="review-status-empty">No pending reviews.</p>';
            }

          } catch (err) {

            console.error(err);

            showToast(
              "Couldn't reject the review.",
              true
            );

          }

        });

      reviewStatusList.appendChild(row);
    }

  } catch (err) {

    console.error(err);

    reviewStatusList.innerHTML =
      '<p class="review-status-empty">Couldn\'t load reviews.</p>';

    showToast(
      "Couldn't load reviews.",
      true
    );
  }
}


// ---------------------------------------------------------------------
// Approve Review - Customer Selection
// ---------------------------------------------------------------------

const approveReviewModal =
  document.getElementById("approve-review-modal");

const approveReviewClose =
  document.getElementById("approve-review-close");

const approveReviewCancel =
  document.getElementById("approve-review-cancel");

const approveReviewConfirm =
  document.getElementById("approve-review-confirm");

const approveReviewRating =
  document.getElementById("approve-review-rating");

const approveReviewText =
  document.getElementById("approve-review-text");

const approveReviewCustomer =
  document.getElementById("approve-review-customer");

let selectedReviewId = null;
let selectedReviewRating = null;
let selectedReviewText = null;


// Open modal
async function openCustomerSelection(
  reviewId,
  rating,
  review
) {
  selectedReviewId = reviewId;
  selectedReviewRating = rating;
  selectedReviewText = review;

  approveReviewRating.textContent =
    `⭐ ${rating}/5`;

  approveReviewText.textContent =
    review || "N/A";

  approveReviewCustomer.innerHTML =
    "<option value=\"\">Loading customers...</option>";

  approveReviewModal.hidden = false;

  try {

    const snapshot = await getDocs(
      collection(db, "customers")
    );

    approveReviewCustomer.innerHTML =
      '<option value="">Select a customer</option>';

    if (snapshot.empty) {

      approveReviewCustomer.innerHTML =
        '<option value="">No customers found</option>';

      return;
    }

    snapshot.forEach((customerDoc) => {

      const customer = customerDoc.data();

      const option = document.createElement("option");

      option.value = customerDoc.id;

      option.textContent =
        `${customer.name || "N/A"} — ${customer.mobile || customerDoc.id}`;

      approveReviewCustomer.appendChild(option);

    });

  } catch (err) {

    console.error(err);

    approveReviewCustomer.innerHTML =
      '<option value="">Couldn\'t load customers</option>';

    showToast(
      "Couldn't load customers.",
      true
    );
  }
}


// Close modal
function closeApproveReviewModal() {
  approveReviewModal.hidden = true;

  selectedReviewId = null;
  selectedReviewRating = null;
  selectedReviewText = null;
}

approveReviewClose.addEventListener(
  "click",
  closeApproveReviewModal
);

approveReviewCancel.addEventListener(
  "click",
  closeApproveReviewModal
);

approveReviewModal.addEventListener(
  "click",
  (event) => {
    if (event.target === approveReviewModal) {
      closeApproveReviewModal();
    }
  }
);

// ---------------------------------------------------------------------
// Confirm Approve
// ---------------------------------------------------------------------

approveReviewConfirm.addEventListener(
  "click",
  async () => {

    const customerId =
      approveReviewCustomer.value;

    if (!customerId) {
      showToast(
        "Please select a customer.",
        true
      );
      return;
    }

    if (!selectedReviewId) {
      showToast(
        "Review information is missing.",
        true
      );
      return;
    }

    approveReviewConfirm.disabled = true;
    approveReviewConfirm.textContent = "Approving...";

    try {

      const batch = writeBatch(db);

      // Customer document
      const customerRef = doc(
        db,
        "customers",
        customerId
      );

      // Review Status document
      const reviewRef = doc(
        db,
        "reviewStatus",
        selectedReviewId
      );

      // Public Review document
      const publicReviewRef = doc(
        db,
        "publicReviews",
         selectedReviewId
);
      // Save rating + review into customer
      batch.update(customerRef, {
        rating: selectedReviewRating,
        review: selectedReviewText,
        reviewedAt: serverTimestamp()
      });

      // Save approved review for public website
batch.set(publicReviewRef, {
  name: approveReviewCustomer.options[
    approveReviewCustomer.selectedIndex
  ].textContent.split(" — ")[0],
  rating: selectedReviewRating,
  review: selectedReviewText,
  approvedAt: serverTimestamp()
});

      // Remove pending review
      batch.delete(reviewRef);

      // Execute both operations together
      await batch.commit();

      closeApproveReviewModal();

      showToast(
        "Review approved successfully."
      );

      // Refresh both sections
      initCustomers();
      initReviewStatus();

    } catch (err) {

      console.error(err);

      showToast(
        "Couldn't approve the review.",
        true
      );

    } finally {

      approveReviewConfirm.disabled = false;
      approveReviewConfirm.textContent = "Approve";

    }

  }
);

// ---------------------------------------------------------------------
// Festival Management — simple settings
// ---------------------------------------------------------------------

const FESTIVAL_SETTINGS_REF = doc(
  db,
  "festivalSettings",
  "settings"
);

async function initFestivalManagement() {
  const enabledInput = document.getElementById(
    "festival-enabled-input"
  );

  const greetingInput = document.getElementById(
    "festival-greeting-input"
  );

  const bannerUrlInput = document.getElementById(
    "festival-banner-url-input"
  );

  const status = document.getElementById(
    "festival-management-status"
  );

  const saveButton = document.getElementById(
    "save-festival-management-btn"
  );

  if (
    !enabledInput ||
    !greetingInput ||
    !bannerUrlInput ||
    !status ||
    !saveButton
  ) {
    return;
  }

  // Load existing settings
  try {
    const snapshot = await getDoc(FESTIVAL_SETTINGS_REF);

    if (snapshot.exists()) {
      const data = snapshot.data();

      enabledInput.checked = data.enabled === true;
      greetingInput.value = data.greeting || "";
      bannerUrlInput.value = data.bannerUrl || "";
    }
  } catch (error) {
    console.error("Failed to load festival settings:", error);

    status.textContent =
      "Couldn't load festival settings.";

    status.classList.add("is-error");
  }

  // Save settings
  saveButton.addEventListener("click", async () => {
    const greeting = greetingInput.value.trim();
    const bannerUrl = bannerUrlInput.value.trim();

    // Basic URL validation
    if (
      bannerUrl &&
      !/^https?:\/\//i.test(bannerUrl)
    ) {
      status.textContent =
        "Please enter a valid image URL starting with http:// or https://.";

      status.classList.add("is-error");

      return;
    }

    saveButton.disabled = true;

    status.classList.remove("is-error");
    status.textContent = "Saving…";

    try {
      await setDoc(FESTIVAL_SETTINGS_REF, {
        enabled: enabledInput.checked,
        greeting,
        bannerUrl,
        updatedAt: serverTimestamp(),
      });

      status.textContent =
        "Festival settings saved.";

      showToast(
        "Festival settings saved."
      );

    } catch (error) {
      console.error(
        "Failed to save festival settings:",
        error
      );

      status.textContent =
        "Couldn't save festival settings. Please try again.";

      status.classList.add("is-error");

      showToast(
        "Couldn't save festival settings.",
        true
      );

    } finally {
      saveButton.disabled = false;
    }
  });
}