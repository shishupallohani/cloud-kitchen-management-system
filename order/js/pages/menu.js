import { requireAuth } from "../auth-guard.js";
import { renderNav } from "../nav.js";
import { getMenu, getCategories } from "../menu-service.js";
import { getFavorites, toggleFavorite } from "../favorites-service.js";
import { getCart, addToCart, updateQuantity, calculateItemCount } from "../cart-service.js";
import {
  formatCurrency,
  escapeHtml,
  showError,
  showSuccess,
  renderLoading,
  renderErrorState,
  updateCartBadge,
} from "../ui.js";

const user = await requireAuth();
renderNav("menu");

const tabsEl = document.getElementById("category-tabs");
const contentEl = document.getElementById("menu-content");

let allDishes = [];
let favoriteIds = new Set();
let cartQuantities = new Map(); // dishId -> quantity
let activeCategory = "All";

async function loadData() {
  renderLoading(contentEl, "Loading menu...");
  try {
    const [dishes, categories, favorites, cartItems] = await Promise.all([
      getMenu(),
      getCategories(),
      getFavorites(user.uid),
      getCart(user.uid),
    ]);

    allDishes = dishes;
    favoriteIds = new Set(favorites.map((f) => f.dishId));
    cartQuantities = new Map(cartItems.map((i) => [i.dishId, i.quantity]));

    renderTabs(categories);
    renderDishes();
    updateCartBadge(calculateItemCount(cartItems));
  } catch (error) {
    renderErrorState(contentEl, "We couldn't load the menu right now.", loadData);
  }
}

function renderTabs(categories) {
  const tabs = ["All", ...categories];
  tabsEl.innerHTML = tabs
    .map(
      (cat) =>
        `<button type="button" class="category-tab${cat === activeCategory ? " category-tab--active" : ""}" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`
    )
    .join("");

  tabsEl.querySelectorAll(".category-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.category;
      tabsEl.querySelectorAll(".category-tab").forEach((b) => b.classList.remove("category-tab--active"));
      btn.classList.add("category-tab--active");
      renderDishes();
    });
  });
}

function dishCardHtml(dish) {
  const isFav = favoriteIds.has(dish.dishId);
  const qty = cartQuantities.get(dish.dishId) || 0;
  const available = dish.available !== false;

  const footerControl = !available
    ? `<span style="color: var(--color-text-muted); font-size: 0.82rem;">Unavailable</span>`
    : qty > 0
    ? `<div class="qty-stepper" data-dish-id="${escapeHtml(dish.dishId)}">
         <button type="button" class="qty-decrease" aria-label="Decrease quantity">−</button>
         <span>${qty}</span>
         <button type="button" class="qty-increase" aria-label="Increase quantity">+</button>
       </div>`
    : `<button type="button" class="btn btn--primary btn--sm add-to-cart-btn" data-dish-id="${escapeHtml(dish.dishId)}">Add</button>`;

  return `
    <div class="card dish-card" data-dish-id="${escapeHtml(dish.dishId)}">
      <div class="dish-card__image-wrap">
        <img src="${escapeHtml(dish.image)}" alt="${escapeHtml(dish.name)}" loading="lazy" />
        <button type="button" class="dish-card__fav-btn${isFav ? " dish-card__fav-btn--active" : ""}" data-dish-id="${escapeHtml(dish.dishId)}" aria-label="Toggle favorite">
          ${isFav ? "♥" : "♡"}
        </button>
        ${!available ? `<div class="dish-card__unavailable-tag">Currently Unavailable</div>` : ""}
      </div>
      <div class="dish-card__body">
        <div class="dish-card__name">${escapeHtml(dish.name)}</div>
        <div class="dish-card__desc">${escapeHtml(dish.description || "")}</div>
        <div class="dish-card__footer">
          <span class="dish-card__price">${formatCurrency(dish.price)}</span>
          ${footerControl}
        </div>
      </div>
    </div>`;
}

function renderDishes() {
  const dishes = activeCategory === "All" ? allDishes : allDishes.filter((d) => d.category === activeCategory);

  if (dishes.length === 0) {
    contentEl.innerHTML = `<div class="state-panel state-panel--empty"><div class="state-panel__icon">🍽️</div><p>No dishes in this category yet.</p></div>`;
    return;
  }

  contentEl.innerHTML = `<div class="dish-grid">${dishes.map(dishCardHtml).join("")}</div>`;
  attachDishHandlers();
}

function attachDishHandlers() {
  contentEl.querySelectorAll(".dish-card__fav-btn").forEach((btn) => {
    btn.addEventListener("click", () => onToggleFavorite(btn.dataset.dishId, btn));
  });
  contentEl.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
    btn.addEventListener("click", () => onAddToCart(btn.dataset.dishId));
  });
  contentEl.querySelectorAll(".qty-stepper").forEach((stepper) => {
    const dishId = stepper.dataset.dishId;
    stepper.querySelector(".qty-increase").addEventListener("click", () => onChangeQuantity(dishId, 1));
    stepper.querySelector(".qty-decrease").addEventListener("click", () => onChangeQuantity(dishId, -1));
  });
}

async function onToggleFavorite(dishId, btn) {
  btn.disabled = true;
  const dish = allDishes.find((d) => d.dishId === dishId);
  try {
    const nowFavorited = await toggleFavorite(user.uid, dish);
    if (nowFavorited) {
      favoriteIds.add(dishId);
      showSuccess(`${dish.name} added to favorites.`);
    } else {
      favoriteIds.delete(dishId);
      showSuccess(`${dish.name} removed from favorites.`);
    }
    renderDishes();
  } catch (error) {
    showError("Couldn't update favorites. Please try again.");
    btn.disabled = false;
  }
}

async function onAddToCart(dishId) {
  const dish = allDishes.find((d) => d.dishId === dishId);
  try {
    await addToCart(user.uid, dish, 1);
    cartQuantities.set(dishId, (cartQuantities.get(dishId) || 0) + 1);
    updateCartBadge(sumQuantities());
    renderDishes();
    showSuccess(`${dish.name} added to cart.`);
  } catch (error) {
    showError("Couldn't add item to cart. Please try again.");
  }
}

async function onChangeQuantity(dishId, delta) {
  const current = cartQuantities.get(dishId) || 0;
  const next = current + delta;
  try {
    await updateQuantity(user.uid, dishId, next);
    if (next <= 0) {
      cartQuantities.delete(dishId);
    } else {
      cartQuantities.set(dishId, next);
    }
    updateCartBadge(sumQuantities());
    renderDishes();
  } catch (error) {
    showError("Couldn't update cart. Please try again.");
  }
}

function sumQuantities() {
  let total = 0;
  cartQuantities.forEach((qty) => (total += qty));
  return total;
}

loadData();
