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
const marqueeEl = document.getElementById("menu-marquee");

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

  // Marquee is a guest-only touch — logged-in customers never see it.
  if (marqueeEl) {
    marqueeEl.hidden = Boolean(user);
  }

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

/* ================================================================
   DISH DETAIL MODAL — NEW FEATURE (fully additive)
   ----------------------------------------------------------------
   Nothing above this line was changed. This block only ADDS a
   click-to-preview modal on top of the existing menu page. It
   reuses the exact same onAddToCart / onChangeQuantity /
   onToggleFavorite functions already defined above, so cart and
   favorite behaviour is 100% identical to the existing Add
   button / heart icon / qty stepper on the grid.
   ================================================================ */

let dishModalOverlay = null;
let currentModalDishId = null;

function buildModalFooterHtml(dish) {

  const qty =
    cartQuantities.get(dish.dishId) || 0;

  const available =
    dish.available !== false;

  if (!available) {
    return `<span style="color: var(--color-text-muted); font-size: 0.9rem;">Currently unavailable</span>`;
  }

  if (qty > 0) {
    return `<div class="qty-stepper" data-dish-id="${escapeHtml(dish.dishId)}">
      <button type="button" class="qty-decrease" aria-label="Decrease quantity">−</button>
      <span>${qty}</span>
      <button type="button" class="qty-increase" aria-label="Increase quantity">+</button>
    </div>`;
  }

  return `<button type="button" class="btn btn--primary add-to-cart-btn" data-dish-id="${escapeHtml(dish.dishId)}">Add to Cart</button>`;
}

function wireModalFooterButtons(dish) {

  if (!dishModalOverlay) return;

  const footerEl =
    dishModalOverlay.querySelector(".dish-modal__footer-control");

  if (!footerEl) return;

  const addBtn = footerEl.querySelector(".add-to-cart-btn");
  if (addBtn) {
    addBtn.addEventListener("click", async () => {
      await onAddToCart(dish.dishId);
      refreshDishModalFooter();
    });
  }

  const incBtn = footerEl.querySelector(".qty-increase");
  if (incBtn) {
    incBtn.addEventListener("click", async () => {
      await onChangeQuantity(dish.dishId, 1);
      refreshDishModalFooter();
    });
  }

  const decBtn = footerEl.querySelector(".qty-decrease");
  if (decBtn) {
    decBtn.addEventListener("click", async () => {
      await onChangeQuantity(dish.dishId, -1);
      refreshDishModalFooter();
    });
  }
}

function refreshDishModalFooter() {

  if (!dishModalOverlay || !currentModalDishId) return;

  const dish =
    allDishes.find((d) => d.dishId === currentModalDishId);

  if (!dish) return;

  const footerEl =
    dishModalOverlay.querySelector(".dish-modal__footer-control");

  if (footerEl) {
    footerEl.innerHTML = buildModalFooterHtml(dish);
  }

  const heartBtn =
    dishModalOverlay.querySelector(".dish-modal__fav-btn");

  if (heartBtn) {
    const isFav = favoriteIds.has(currentModalDishId);
    heartBtn.classList.toggle("dish-card__fav-btn--active", isFav);
    heartBtn.textContent = isFav ? "♥" : "♡";
    heartBtn.disabled = false;
  }

  wireModalFooterButtons(dish);
}

function closeDishModal() {

  if (!dishModalOverlay) return;

  dishModalOverlay.classList.remove("dish-modal-overlay--visible");

  const overlayToRemove = dishModalOverlay;

  setTimeout(() => {
    overlayToRemove.remove();
  }, 280);

  dishModalOverlay = null;
  currentModalDishId = null;

  document.removeEventListener("keydown", escCloseHandler);
}

function escCloseHandler(event) {
  if (event.key === "Escape") {
    closeDishModal();
  }
}

function openDishModal(dish) {

  if (dishModalOverlay) {
    closeDishModal();
  }

  currentModalDishId = dish.dishId;

  const isFav = favoriteIds.has(dish.dishId);

  const overlay = document.createElement("div");
  overlay.className = "dish-modal-overlay";

  overlay.innerHTML = `
    <div class="dish-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(dish.name)}">
      <button type="button" class="dish-modal__close" aria-label="Close">✕</button>
      <div class="dish-modal__image-wrap">
        <img src="${escapeHtml(dish.image)}" alt="${escapeHtml(dish.name)}" class="dish-modal__image" />
        <button
          type="button"
          class="dish-card__fav-btn dish-modal__fav-btn${isFav ? " dish-card__fav-btn--active" : ""}"
          aria-label="Toggle favorite"
        >${isFav ? "♥" : "♡"}</button>
      </div>
      <div class="dish-modal__body">
        <div class="dish-modal__name">${escapeHtml(dish.name)}</div>
        <div class="dish-modal__desc">${escapeHtml(dish.description || "")}</div>
        <div class="dish-modal__footer">
          <span class="dish-modal__price">${formatCurrency(dish.price)}</span>
          <div class="dish-modal__footer-control">${buildModalFooterHtml(dish)}</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  dishModalOverlay = overlay;

  requestAnimationFrame(() => {
    overlay.classList.add("dish-modal-overlay--visible");
  });

  overlay
    .querySelector(".dish-modal__close")
    .addEventListener("click", closeDishModal);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeDishModal();
    }
  });

  const heartBtn =
    overlay.querySelector(".dish-modal__fav-btn");

  heartBtn.addEventListener("click", async () => {
    heartBtn.disabled = true;
    // Wait for the favorite save to actually finish before refreshing
    // the heart icon - a fixed setTimeout guessed at the save time and
    // could refresh too early, showing a stale (unfilled) heart even
    // though the favorite was saved successfully.
    await onToggleFavorite(dish.dishId, heartBtn);
    refreshDishModalFooter();
  });

  wireModalFooterButtons(dish);

  document.addEventListener("keydown", escCloseHandler);
}

/*
 * Delegated click listener on contentEl.
 * contentEl itself is never replaced (only its innerHTML, inside
 * renderDishes()), so this single listener survives every
 * re-render without needing any change to attachDishHandlers().
 *
 * Clicks on the favorite button, Add button, or qty stepper are
 * ignored here so their existing behaviour keeps working exactly
 * as before — only a click on the card itself (image/name/desc
 * area) opens the detail view.
 */
contentEl.addEventListener("click", (event) => {

  const card = event.target.closest(".dish-card");
  if (!card) return;

  const isControlClick =
    event.target.closest(".dish-card__fav-btn") ||
    event.target.closest(".add-to-cart-btn") ||
    event.target.closest(".qty-stepper");

  if (isControlClick) return;

  const dishId = card.dataset.dishId;
  const dish = allDishes.find((d) => d.dishId === dishId);

  if (dish) {
    openDishModal(dish);
  }
});
