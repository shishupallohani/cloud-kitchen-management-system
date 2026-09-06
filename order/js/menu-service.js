/**
 * menu-service.js
 * -----------------------------------------------------------------------
 * SINGLE SOURCE OF TRUTH FOR ORDER UI → EXPLORE MENU
 *
 * Current source:
 *   1. Live Thali
 *      Firestore: dailyMenus/current
 *
 * Future source:
 *   2. Website Explore Menu
 *      Admin Panel se manage hoga
 *
 * Order Explore Menu automatically combines both sources.
 *
 * PRICE RULE:
 *   Only dishes with a valid price greater than 0 are shown.
 *
 * Invalid price:
 *   - null
 *   - undefined
 *   - ""
 *   - non-numeric
 *   - 0
 *
 * IMPORTANT:
 *   Today's Menu is NOT used here.
 * -----------------------------------------------------------------------
 */

import { db } from "./firebase.js";

import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";


// -----------------------------------------------------------------------
// Firestore sources
// -----------------------------------------------------------------------

const DAILY_MENUS_COLLECTION = "dailyMenus";

// Current Live Thali
const LIVE_THALI_DOCUMENT = "current";

// Future Website Explore Menu
//
// IMPORTANT:
// When Website Explore Menu is moved to Admin Panel,
// keep its data in this document with the same `items` structure.
//
// Example:
// dailyMenus/explore
//
const WEBSITE_EXPLORE_DOCUMENT = "explore";


// -----------------------------------------------------------------------
// Price validation
// -----------------------------------------------------------------------

function isValidPrice(price) {
  if (price === null || price === undefined || price === "") {
    return false;
  }

  const numericPrice = Number(price);

  return Number.isFinite(numericPrice) && numericPrice > 0;
}


// -----------------------------------------------------------------------
// Dish ID helper
// -----------------------------------------------------------------------

function createDishId(name, fallback = "") {
  if (!name) {
    return fallback || `dish-${Date.now()}`;
  }

  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


// -----------------------------------------------------------------------
// Normalize dish
// -----------------------------------------------------------------------

function normalizeDish(rawDish, fallbackId = "") {
  if (!rawDish || !rawDish.name) {
    return null;
  }

  // ---------------------------------------------------------------
  // IMPORTANT:
  // A dish without a valid price must never appear
  // in Order Explore Menu.
  // ---------------------------------------------------------------

  if (!isValidPrice(rawDish.price)) {
    return null;
  }

  const numericPrice = Number(rawDish.price);

  const dishId =
    rawDish.dishId ||
    rawDish.id ||
    fallbackId ||
    createDishId(rawDish.name);

  return {
    dishId: String(dishId),

    name: String(rawDish.name),

    description: rawDish.description || "",

    price: numericPrice,

    image: rawDish.imageUrl || rawDish.image || "",

    category: rawDish.category || "Other",

    available: rawDish.available !== false,

    order: Number.isFinite(Number(rawDish.order))
      ? Number(rawDish.order)
      : 999999,
  };
}


// -----------------------------------------------------------------------
// Generic Firestore menu reader
// -----------------------------------------------------------------------

async function fetchMenuDocument(documentId) {
  const snapshot = await getDoc(
    doc(
      db,
      DAILY_MENUS_COLLECTION,
      documentId
    )
  );

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.data();

  if (!Array.isArray(data.items)) {
    return [];
  }

  return data.items
    .map((item, index) => {
      return normalizeDish(
        item,
        item?.dishId ||
          item?.id ||
          createDishId(
            item?.name,
            `${documentId}-${index}`
          )
      );
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
}


// -----------------------------------------------------------------------
// Live Thali
// -----------------------------------------------------------------------

async function fetchLiveThali() {
  return fetchMenuDocument(
    LIVE_THALI_DOCUMENT
  );
}


// -----------------------------------------------------------------------
// Website Explore Menu
// -----------------------------------------------------------------------

async function fetchWebsiteExploreMenu() {
  return fetchMenuDocument(
    WEBSITE_EXPLORE_DOCUMENT
  );
}


// -----------------------------------------------------------------------
// Merge menu sources
// -----------------------------------------------------------------------

async function loadMenu() {
  const [
    liveThali,
    websiteExploreMenu,
  ] = await Promise.all([
    fetchLiveThali(),
    fetchWebsiteExploreMenu(),
  ]);

  const result = [];
  const seen = new Set();

  function addDishes(dishes) {
    for (const dish of dishes) {
      if (!dish || !dish.dishId) {
        continue;
      }

      // Prevent duplicate dishes
      if (seen.has(dish.dishId)) {
        continue;
      }

      seen.add(dish.dishId);
      result.push(dish);
    }
  }

  // ---------------------------------------------------------------
  // Priority:
  //
  // 1. Live Thali
  // 2. Website Explore Menu
  //
  // Today's Menu is intentionally NOT included.
  // ---------------------------------------------------------------

  addDishes(liveThali);
  addDishes(websiteExploreMenu);

  return result;
}


// -----------------------------------------------------------------------
// Menu cache
// -----------------------------------------------------------------------

let menuCachePromise = null;


// -----------------------------------------------------------------------
// Get complete Order Explore Menu
// -----------------------------------------------------------------------

export async function getMenu() {
  if (!menuCachePromise) {
    menuCachePromise = loadMenu();
  }

  return menuCachePromise;
}


// -----------------------------------------------------------------------
// Get only available dishes
// -----------------------------------------------------------------------

export async function getAvailableMenu() {
  const menu = await getMenu();

  return menu.filter(
    (dish) => dish.available !== false
  );
}


// -----------------------------------------------------------------------
// Categories
// -----------------------------------------------------------------------

export async function getCategories() {
  const menu = await getMenu();

  const seen = new Set();
  const categories = [];

  for (const dish of menu) {
    if (
      dish.category &&
      !seen.has(dish.category)
    ) {
      seen.add(dish.category);
      categories.push(dish.category);
    }
  }

  return categories;
}


// -----------------------------------------------------------------------
// Get single dish
// -----------------------------------------------------------------------

export async function getDishById(dishId) {
  const menu = await getMenu();

  return (
    menu.find(
      (dish) => dish.dishId === dishId
    ) || null
  );
}