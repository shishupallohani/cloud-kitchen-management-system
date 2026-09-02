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

let booted = false;
function bootDashboard() {
  if (booted) return;
  booted = true;
  initOverview();
  initMenuEditor();
  initFestivals();
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

  node.querySelector('[data-action="remove"]').addEventListener("click", () => node.remove());
  node.querySelector('[data-action="move-up"]').addEventListener("click", () => {
    const prev = node.previousElementSibling;
    if (prev) itemsList.insertBefore(node, prev);
  });
  node.querySelector('[data-action="move-down"]').addEventListener("click", () => {
    const next = node.nextElementSibling;
    if (next) itemsList.insertBefore(next, node);
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

  document.getElementById("add-item-btn").addEventListener("click", () => addItemRow());

  document.getElementById("save-menu-btn").addEventListener("click", async () => {
    if (!dateInput.value) return setStatus("Pick a date first.", true);
    const items = readItemsFromEditor();
    try {
      await saveMenuForDate(dateInput.value, { items, specialNote: specialNoteInput.value.trim() });
      setStatus(`Saved menu for ${formatDisplayDate(dateInput.value)}.`);
      initOverview();
    } catch (err) {
      console.error(err);
      setStatus("Couldn't save the menu. Please try again.", true);
    }
  });

  document.getElementById("delete-menu-btn").addEventListener("click", async () => {
    if (!dateInput.value) return;
    if (!confirm(`Delete the menu for ${formatDisplayDate(dateInput.value)}? This can't be undone.`)) return;
    try {
      await deleteMenuForDate(dateInput.value);
      itemsList.innerHTML = "";
      specialNoteInput.value = "";
      setStatus(`Deleted menu for ${formatDisplayDate(dateInput.value)}.`);
      initOverview();
    } catch (err) {
      console.error(err);
      setStatus("Couldn't delete the menu.", true);
    }
  });

  document.getElementById("duplicate-menu-btn").addEventListener("click", async () => {
    if (!dateInput.value || !duplicateTargetInput.value) {
      return setStatus("Pick both a source date and a target date.", true);
    }
    try {
      await duplicateMenu(dateInput.value, duplicateTargetInput.value);
      setStatus(
        `Copied ${formatDisplayDate(dateInput.value)} → ${formatDisplayDate(duplicateTargetInput.value)}.`
      );
      initOverview();
    } catch (err) {
      console.error(err);
      setStatus(err.message || "Couldn't duplicate the menu.", true);
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
    return setStatus("Festival needs a name, start date, and end date.", true);
  }
  try {
    if (node.dataset.id) {
      await setDoc(doc(db, "festivals", node.dataset.id), payload);
    } else {
      const ref = await addDoc(collection(db, "festivals"), payload);
      node.dataset.id = ref.id;
    }
    setStatus(`Saved "${payload.name}".`);
    initOverview();
  } catch (err) {
    console.error(err);
    setStatus("Couldn't save that festival.", true);
  }
}

async function removeFestivalRow(node) {
  if (!confirm("Delete this festival?")) return;
  try {
    if (node.dataset.id) await deleteDoc(doc(db, "festivals", node.dataset.id));
    node.remove();
  } catch (err) {
    console.error(err);
    setStatus("Couldn't delete that festival.", true);
  }
}

async function initFestivals() {
  festivalsList.innerHTML = "";
  const snap = await getDocs(collection(db, "festivals"));
  snap.docs.forEach((d) => addFestivalRow(d.id, d.data()));

  document.getElementById("add-festival-btn").addEventListener("click", () => addFestivalRow(null));
}
