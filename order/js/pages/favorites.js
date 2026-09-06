import { requireAuth } from "../auth-guard.js";
import { renderNav } from "../nav.js";
import { getFavorites, removeFavorite } from "../favorites-service.js";
import { addToCart, getCart, calculateItemCount } from "../cart-service.js";
import {
  formatCurrency,
  escapeHtml,
  showError,
  showSuccess,
  renderLoading,
  renderEmpty,
  renderErrorState,
  updateCartBadge,
} from "../ui.js";

const user = await requireAuth();
renderNav("favorites");

const contentEl = document.getElementById("favorites-content");

async function loadFavorites() {
  renderLoading(contentEl, "Loading your favorites...");
  try {
    const [favorites, cartItems] = await Promise.all([getFavorites(user.uid), getCart(user.uid)]);
    updateCartBadge(calculateItemCount(cartItems));

    if (favorites.length === 0) {
      renderEmpty(contentEl, "No favorites yet. Tap the heart icon on any dish to save it here.", "🤍");
      return;
    }

    contentEl.innerHTML = `<div class="card" id="favorites-list"></div>`;
    const listEl = document.getElementById("favorites-list");
    listEl.innerHTML = favorites
      .map(
        (dish) => `
        <div class="favorite-row" data-dish-id="${escapeHtml(dish.dishId)}" style="border-bottom: 1px solid var(--color-border);">
          <img class="favorite-row__image" src="${escapeHtml(dish.image)}" alt="${escapeHtml(dish.name)}" />
          <div class="favorite-row__body">
            <div class="favorite-row__name">${escapeHtml(dish.name)}</div>
            <div class="favorite-row__price">${formatCurrency(dish.price)}</div>
          </div>
          <div class="favorite-row__actions">
            <button type="button" class="btn btn--primary btn--sm add-cart-btn">Add to Cart</button>
            <button type="button" class="btn btn--danger btn--sm remove-fav-btn">Remove</button>
          </div>
        </div>`
      )
      .join("");

    listEl.querySelectorAll(".favorite-row").forEach((row) => {
      const dishId = row.dataset.dishId;
      const dish = favorites.find((f) => f.dishId === dishId);

      row.querySelector(".add-cart-btn").addEventListener("click", async (event) => {
        try {
          await addToCart(user.uid, dish, 1);
          const cart = await getCart(user.uid);
          updateCartBadge(calculateItemCount(cart));
          showSuccess(`${dish.name} added to cart.`);
        } catch (error) {
          showError("Couldn't add item to cart. Please try again.");
        }
      });

      row.querySelector(".remove-fav-btn").addEventListener("click", async () => {
        try {
          await removeFavorite(user.uid, dishId);
          showSuccess(`${dish.name} removed from favorites.`);
          loadFavorites();
        } catch (error) {
          showError("Couldn't remove favorite. Please try again.");
        }
      });
    });
  } catch (error) {
    renderErrorState(contentEl, "We couldn't load your favorites right now.", loadFavorites);
  }
}

loadFavorites();
