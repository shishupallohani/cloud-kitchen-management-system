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
import { getActiveFestival } from "./festival.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
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
  initFestivals();
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
  document.getElementById("overview-today-date").textContent = formatDisplayDate(todayKey);

  const [todayMenu, festival, range] = await Promise.all([
    fetchMenuForDate(todayKey),
    getActiveFestival(),
    fetchMenusForRange(todayKey, 7),
  ]);

  document.getElementById("overview-today-count").textContent = todayMenu
    ? `${(todayMenu.items || []).length} item(s) on today's menu`
    : "No menu configured for today yet";

  document.getElementById("overview-festival").textContent = festival
    ? `${festival.name} — ${festival.greeting || ""}`
    : "None";

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
// Festivals
// ---------------------------------------------------------------------
const festivalsList = document.getElementById("festivals-list");
const festivalRowTemplate = document.getElementById("festival-row-template");

function addFestivalRow(id, data = {}) {
  const node = festivalRowTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.id = id || "";
  node.querySelector('[data-field="name"]').value = data.name || "";
  node.querySelector('[data-field="theme"]').value = data.theme || "";
  node.querySelector('[data-field="startDate"]').value = data.startDate || "";
  node.querySelector('[data-field="endDate"]').value = data.endDate || "";
  node.querySelector('[data-field="greeting"]').value = data.greeting || "";
  node.querySelector('[data-field="enabled"]').checked = data.enabled !== false;

  node.querySelector('[data-action="save"]').addEventListener("click", () => saveFestivalRow(node));
  node.querySelector('[data-action="remove"]').addEventListener("click", () => removeFestivalRow(node));

  festivalsList.appendChild(node);
  return node;
}

async function saveFestivalRow(node) {
  const val = (field) => node.querySelector(`[data-field="${field}"]`).value;
  const payload = {
    name: val("name").trim(),
    theme: val("theme").trim(),
    startDate: val("startDate"),
    endDate: val("endDate"),
    greeting: val("greeting").trim(),
    enabled: node.querySelector('[data-field="enabled"]').checked,
  };
  if (!payload.name || !payload.startDate || !payload.endDate) {
    return showToast("Festival needs a name, start date, and end date.", true);
  }
  try {
    if (node.dataset.id) {
      await setDoc(doc(db, "festivals", node.dataset.id), payload);
    } else {
      const ref = await addDoc(collection(db, "festivals"), payload);
      node.dataset.id = ref.id;
    }
    setStatus(`Saved "${payload.name}".`);
    showToast(`"${payload.name}" saved.`);
    initOverview();
  } catch (err) {
    console.error(err);
    setStatus("Couldn't save that festival.", true);
    showToast("Couldn't save that festival.", true);
  }
}

async function removeFestivalRow(node) {
  const name = node.querySelector('[data-field="name"]').value || "This festival";
  const ok = await confirmDialog(`Delete ${name}? This can't be undone.`);
  if (!ok) return;
  try {
    if (node.dataset.id) await deleteDoc(doc(db, "festivals", node.dataset.id));
    node.remove();
    showToast(`${name} deleted.`);
  } catch (err) {
    console.error(err);
    setStatus("Couldn't delete that festival.", true);
    showToast("Couldn't delete that festival.", true);
  }
}

async function initFestivals() {
  festivalsList.innerHTML = "";
  const snap = await getDocs(collection(db, "festivals"));
  snap.docs.forEach((d) => addFestivalRow(d.id, d.data()));

  document.getElementById("add-festival-btn").addEventListener("click", () => {
    addFestivalRow(null);
    showToast("New festival row added — fill it in and click Save.");
  });
}
