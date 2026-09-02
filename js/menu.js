/**
 * menu.js
 * -----------------------------------------------------------------------
 * Date-based daily menu: dailyMenus/{YYYY-MM-DD}
 * Shared between the public site (read-only) and the admin panel
 * (read + write, in admin.js).
 * -----------------------------------------------------------------------
 */

import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

/** "2026-09-01" style date string for a given Date (defaults to today). */
export function toDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dateKeyPlusDays(baseKey, days) {
  const [y, m, d] = baseKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function formatDisplayDate(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Fetch a single day's menu. Returns null if it doesn't exist. */
export async function fetchMenuForDate(dateKey) {
  const ref = doc(db, "dailyMenus", dateKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { date: dateKey, ...snap.data() };
}

/** Fetch several days at once (used for the admin "upcoming" view). */
export async function fetchMenusForRange(startKey, dayCount) {
  const keys = Array.from({ length: dayCount }, (_, i) =>
    dateKeyPlusDays(startKey, i)
  );
  const results = await Promise.all(keys.map((k) => fetchMenuForDate(k)));
  return keys.map((key, i) => ({ date: key, menu: results[i] }));
}

/** Create or fully replace a day's menu. */
export async function saveMenuForDate(dateKey, { items, specialNote }) {
  const ref = doc(db, "dailyMenus", dateKey);
  await setDoc(ref, {
    date: dateKey,
    items: items.map((item, i) => ({ order: i + 1, ...item })),
    specialNote: specialNote || "",
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteMenuForDate(dateKey) {
  await deleteDoc(doc(db, "dailyMenus", dateKey));
}

/** Copy one day's menu onto another date. Throws if the source is empty. */
export async function duplicateMenu(sourceKey, targetKey) {
  const source = await fetchMenuForDate(sourceKey);
  if (!source) throw new Error(`No menu found for ${sourceKey} to duplicate.`);
  await saveMenuForDate(targetKey, {
    items: source.items || [],
    specialNote: source.specialNote || "",
  });
}

/** List every configured menu date (used sparingly — admin overview only). */
export async function listAllMenuDates() {
  const snap = await getDocs(collection(db, "dailyMenus"));
  return snap.docs.map((d) => d.id).sort();
}

// ---------------------------------------------------------------------
// Public-site rendering
// ---------------------------------------------------------------------

function menuItemCard(item) {
  const unavailable = item.available === false;
  return `
    <li class="menu-item${unavailable ? " menu-item--unavailable" : ""}">
      <div class="menu-item__media">
        ${
          item.imageUrl
            ? `<img src="${item.imageUrl}" alt="${item.name}" loading="lazy" />`
            : `<div class="menu-item__media-fallback" aria-hidden="true">${item.name
                .charAt(0)
                .toUpperCase()}</div>`
        }
      </div>
      <div class="menu-item__body">
        <div class="menu-item__top">
          <h3>${item.name}</h3>
          ${item.price ? `<span class="menu-item__price">₹${item.price}</span>` : ""}
        </div>
        ${item.description ? `<p>${item.description}</p>` : ""}
        ${item.category ? `<span class="menu-item__tag">${item.category}</span>` : ""}
        ${unavailable ? `<span class="menu-item__tag menu-item__tag--out">Sold out today</span>` : ""}
      </div>
    </li>`;
}

export function renderTodaysMenu(container, menu, dateKey) {
  const dateLabel = formatDisplayDate(dateKey);
  const dateEl = document.getElementById("menu-date-label");
  if (dateEl) dateEl.textContent = dateLabel;

  if (!menu || !menu.items || menu.items.length === 0) {
    container.innerHTML = `
      <div class="menu-empty">
        <p>Today's menu is being prepared.</p>
        <p class="menu-empty__sub">Please check back shortly — or call us and we'll tell you what's cooking.</p>
      </div>`;
    return;
  }

  const items = [...menu.items].sort((a, b) => (a.order || 0) - (b.order || 0));
  container.innerHTML = `
    ${menu.specialNote ? `<p class="menu-note">${menu.specialNote}</p>` : ""}
    <ul class="menu-list">${items.map(menuItemCard).join("")}</ul>`;
}
