import { onAuthChange } from "../auth.js";
import { renderNav } from "../nav.js";
import { getMenu, getCategories } from "../menu-service.js";
import { getFavorites, toggleFavorite } from "../favorites-service.js";
import {
  getCart,
  addToCart,
  updateQuantity,
  calculateItemCount,
  getGuestCart,
  addToGuestCart,
  updateGuestQuantity,
} from "../cart-service.js";
import {
  formatCurrency,
  escapeHtml,
  showError,
  showSuccess,
  renderLoading,
  renderErrorState,
  updateCartBadge,
} from "../ui.js";

const tabsEl = document.getElementById("category-tabs");
const contentEl = document.getElementById("menu-content");

let user = null;

let allDishes = [];
let favoriteIds = new Set();
let cartQuantities = new Map(); // dishId -> quantity
let activeCategory = "All";


/* ================================================================
   AUTH STATE
   ================================================================ */

onAuthChange(async (authUser) => {
  user = authUser || null;

  /*
   * Guest:
   *   Menu + Cart + Login
   *
   * Logged-in:
   *   Existing full navigation
   */
  renderNav("menu", {
    guest: !user,
  });

  await loadData();
});


/* ================================================================
   LOAD DATA
   ================================================================ */

async function loadData() {
  renderLoading(contentEl, "Loading menu...");

  try {
    const [dishes, categories] = await Promise.all([
      getMenu(),
      getCategories(),
    ]);

    allDishes = dishes;

    /*
     * ============================================================
     * LOGGED-IN USER
     * ============================================================
     *
     * Favorites + cart continue to use Firebase exactly
     * like before.
     */

    if (user) {
      const [favorites, cartItems] = await Promise.all([
        getFavorites(user.uid),
        getCart(user.uid),
      ]);

      favoriteIds = new Set(
        favorites.map((f) => f.dishId)
      );

      cartQuantities = new Map(
        cartItems.map((i) => [
          i.dishId,
          i.quantity,
        ])
      );

      updateCartBadge(
        calculateItemCount(cartItems)
      );

    } else {

      /*
       * ==========================================================
       * GUEST USER
       * ==========================================================
       *
       * Favorites are account-based, so guests don't have
       * persistent favorites.
       *
       * Cart is stored locally on this device.
       */

      favoriteIds = new Set();

      const guestCart =
        getGuestCart();

      cartQuantities = new Map(
        guestCart.map((item) => [
          item.dishId,
          item.quantity,
        ])
      );

      updateCartBadge(
        calculateItemCount(guestCart)
      );
    }

    renderTabs(categories);
    renderDishes();

  } catch (error) {
    console.error(
      "MENU LOAD ERROR:",
      error
    );

    renderErrorState(
      contentEl,
      "We couldn't load the menu right now.",
      loadData
    );
  }
}


/* ================================================================
   CATEGORY TABS
   ================================================================ */

function renderTabs(categories) {
  const tabs = [
    "All",
    ...categories,
  ];

  tabsEl.innerHTML = tabs
    .map(
      (cat) =>
        `<button type="button" class="category-tab${
          cat === activeCategory
            ? " category-tab--active"
            : ""
        }" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`
    )
    .join("");

  tabsEl
    .querySelectorAll(".category-tab")
    .forEach((btn) => {

      btn.addEventListener("click", () => {

        activeCategory =
          btn.dataset.category;

        tabsEl
          .querySelectorAll(".category-tab")
          .forEach((b) =>
            b.classList.remove(
              "category-tab--active"
            )
          );

        btn.classList.add(
          "category-tab--active"
        );

        renderDishes();
      });

    });
}


/* ================================================================
   DISH CARD
   ================================================================ */

function dishCardHtml(dish) {

  const isFav =
    favoriteIds.has(
      dish.dishId
    );

  const qty =
    cartQuantities.get(
      dish.dishId
    ) || 0;

  const available =
    dish.available !== false;


  /*
   * IMPORTANT:
   * This is the ORIGINAL UI structure.
   * No design/classes have been changed.
   */

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


/* ================================================================
   RENDER DISHES
   ================================================================ */

function renderDishes() {

  const dishes =
    activeCategory === "All"
      ? allDishes
      : allDishes.filter(
          (d) =>
            d.category ===
            activeCategory
        );


  if (dishes.length === 0) {

    contentEl.innerHTML =
      `<div class="state-panel state-panel--empty"><div class="state-panel__icon">🍽️</div><p>No dishes in this category yet.</p></div>`;

    return;
  }


  contentEl.innerHTML =
    `<div class="dish-grid">${dishes
      .map(dishCardHtml)
      .join("")}</div>`;


  attachDishHandlers();
}


/* ================================================================
   ATTACH DISH HANDLERS
   ================================================================ */

function attachDishHandlers() {

  contentEl
    .querySelectorAll(
      ".dish-card__fav-btn"
    )
    .forEach((btn) => {

      btn.addEventListener(
        "click",
        () =>
          onToggleFavorite(
            btn.dataset.dishId,
            btn
          )
      );

    });


  contentEl
    .querySelectorAll(
      ".add-to-cart-btn"
    )
    .forEach((btn) => {

      btn.addEventListener(
        "click",
        () =>
          onAddToCart(
            btn.dataset.dishId
          )
      );

    });


  contentEl
    .querySelectorAll(
      ".qty-stepper"
    )
    .forEach((stepper) => {

      const dishId =
        stepper.dataset.dishId;


      stepper
        .querySelector(
          ".qty-increase"
        )
        .addEventListener(
          "click",
          () =>
            onChangeQuantity(
              dishId,
              1
            )
        );


      stepper
        .querySelector(
          ".qty-decrease"
        )
        .addEventListener(
          "click",
          () =>
            onChangeQuantity(
              dishId,
              -1
            )
        );

    });
}


/* ================================================================
   FAVORITE
   ================================================================ */

async function onToggleFavorite(
  dishId,
  btn
) {

  /*
   * Guest can browse menu freely.
   *
   * Favorites require an account because
   * they are persisted against the user's
   * Firebase account.
   */

  if (!user) {

    window.location.href =
      "login.html?redirect=menu.html";

    return;
  }


  btn.disabled = true;


  const dish =
    allDishes.find(
      (d) =>
        d.dishId === dishId
    );


  try {

    const nowFavorited =
      await toggleFavorite(
        user.uid,
        dish
      );


    if (nowFavorited) {

      favoriteIds.add(
        dishId
      );

      showSuccess(
        `${dish.name} added to favorites.`
      );

    } else {

      favoriteIds.delete(
        dishId
      );

      showSuccess(
        `${dish.name} removed from favorites.`
      );

    }


    renderDishes();

  } catch (error) {

    console.error(
      "FAVORITE ERROR:",
      error
    );

    showError(
      "Couldn't update favorites. Please try again."
    );

    btn.disabled = false;
  }
}


/* ================================================================
   ADD TO CART
   ================================================================ */

async function onAddToCart(
  dishId
) {

  const dish =
    allDishes.find(
      (d) =>
        d.dishId === dishId
    );


  if (!dish) {
    return;
  }


  try {

    /*
     * ============================================================
     * LOGGED-IN USER
     * ============================================================
     */

    if (user) {

      await addToCart(
        user.uid,
        dish,
        1
      );


    /*
     * ============================================================
     * GUEST USER
     * ============================================================
     */

    } else {

      addToGuestCart(
        {
          dishId: dish.dishId,
          name: dish.name,
          price: dish.price,
          image: dish.image,
        },
        1
      );

    }


    /*
     * Update local UI immediately.
     */

    cartQuantities.set(
      dishId,
      (cartQuantities.get(
        dishId
      ) || 0) + 1
    );


    updateCartBadge(
      sumQuantities()
    );


    renderDishes();


    showSuccess(
      `${dish.name} added to cart.`
    );


  } catch (error) {

    console.error(
      "ADD TO CART ERROR:",
      error
    );

    showError(
      "Couldn't add item to cart. Please try again."
    );
  }
}


/* ================================================================
   CHANGE QUANTITY
   ================================================================ */

async function onChangeQuantity(
  dishId,
  delta
) {

  const current =
    cartQuantities.get(
      dishId
    ) || 0;


  const next =
    current + delta;


  try {

    /*
     * ============================================================
     * LOGGED-IN USER
     * ============================================================
     */

    if (user) {

      await updateQuantity(
        user.uid,
        dishId,
        next
      );


    /*
     * ============================================================
     * GUEST USER
     * ============================================================
     */

    } else {

      updateGuestQuantity(
        dishId,
        next
      );

    }


    /*
     * Update local UI state.
     */

    if (next <= 0) {

      cartQuantities.delete(
        dishId
      );

    } else {

      cartQuantities.set(
        dishId,
        next
      );

    }


    updateCartBadge(
      sumQuantities()
    );


    renderDishes();


  } catch (error) {

    console.error(
      "UPDATE CART ERROR:",
      error
    );

    showError(
      "Couldn't update cart. Please try again."
    );
  }
}


/* ================================================================
   SUM QUANTITIES
   ================================================================ */

function sumQuantities() {

  let total = 0;


  cartQuantities.forEach(
    (qty) => {
      total += qty;
    }
  );


  return total;
}