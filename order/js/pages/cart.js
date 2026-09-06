import { onAuthChange } from "../auth.js";
import { renderNav } from "../nav.js";
import {
  getCart,
  getGuestCart,
  updateQuantity,
  updateGuestQuantity,
  removeFromCart,
  removeGuestCartItem,
  calculateSubtotal,
  calculateDeliveryCharge,
  calculateItemCount,
} from "../cart-service.js";
import { APP_CONFIG } from "../config.js";
import {
  formatCurrency,
  escapeHtml,
  showError,
  showSuccess,
  renderEmpty,
  updateCartBadge,
} from "../ui.js";


let user = null;


/* -----------------------------------------------------------------------
   Page elements
   ----------------------------------------------------------------------- */

const layoutEl =
  document.getElementById("cart-layout");

const itemsCardEl =
  document.getElementById("cart-items-card");

const emptyStateEl =
  document.getElementById("cart-empty-state");

const checkoutBtn =
  document.getElementById("checkout-btn");


/* -----------------------------------------------------------------------
   Auth state
   ----------------------------------------------------------------------- */

onAuthChange(async (authUser) => {

  user = authUser || null;

  renderNav(
    "cart",
    {
      guest: !user,
    }
  );

  await loadCart();

});


/* -----------------------------------------------------------------------
   Load cart
   ----------------------------------------------------------------------- */

async function loadCart() {

  try {

    const items =
      user
        ? await getCart(user.uid)
        : getGuestCart();


    updateCartBadge(
      calculateItemCount(items)
    );


    if (items.length === 0) {

      layoutEl.style.display =
        "none";

      renderEmpty(
        emptyStateEl,
        "Your cart is empty. Explore the menu to add something delicious!",
        "🛒"
      );

      return;
    }


    layoutEl.style.display =
      "grid";

    emptyStateEl.innerHTML =
      "";

    renderItems(items);

    renderSummary(items);

  } catch (error) {

    console.error(error);

    layoutEl.style.display =
      "none";

    emptyStateEl.innerHTML = `
      <div class="state-panel state-panel--error">
        <div class="state-panel__icon">
          ⚠️
        </div>

        <p>
          We couldn't load your cart right now.
        </p>
      </div>
    `;
  }
}


/* -----------------------------------------------------------------------
   Render cart items
   ----------------------------------------------------------------------- */

function renderItems(items) {

  itemsCardEl.innerHTML = items
    .map(
      (item) => `
      <div
        class="cart-item"
        data-dish-id="${escapeHtml(item.dishId)}"
      >

        <img
          class="cart-item__image"
          src="${escapeHtml(item.image || "")}"
          alt="${escapeHtml(item.name)}"
        />

        <div class="cart-item__body">

          <div class="cart-item__name">
            ${escapeHtml(item.name)}
          </div>

          <div class="cart-item__price">
            ${formatCurrency(item.price)} each
          </div>

          <div
            class="qty-stepper"
            style="margin-top: 8px;"
          >

            <button
              type="button"
              class="qty-decrease"
              aria-label="Decrease quantity"
            >
              −
            </button>

            <span>
              ${item.quantity}
            </span>

            <button
              type="button"
              class="qty-increase"
              aria-label="Increase quantity"
            >
              +
            </button>

          </div>

        </div>

        <div
          class="cart-item__line-total"
        >
          ${formatCurrency(
            item.price * item.quantity
          )}
        </div>

        <button
          type="button"
          class="cart-item__remove"
          aria-label="Remove item"
        >
          ✕
        </button>

      </div>`
    )
    .join("");


  itemsCardEl
    .querySelectorAll(".cart-item")
    .forEach((row) => {

      const dishId =
        row.dataset.dishId;


      row
        .querySelector(".qty-increase")
        .addEventListener(
          "click",
          () =>
            changeQuantity(
              dishId,
              1
            )
        );


      row
        .querySelector(".qty-decrease")
        .addEventListener(
          "click",
          () =>
            changeQuantity(
              dishId,
              -1
            )
        );


      row
        .querySelector(".cart-item__remove")
        .addEventListener(
          "click",
          () =>
            removeItem(
              dishId
            )
        );

    });
}


/* -----------------------------------------------------------------------
   Render summary
   ----------------------------------------------------------------------- */

function renderSummary(items) {

  const subtotal =
    calculateSubtotal(items);

  const delivery =
    calculateDeliveryCharge(
      subtotal
    );

  const total =
    subtotal + delivery;


  document
    .getElementById(
      "summary-subtotal"
    )
    .textContent =
    formatCurrency(
      subtotal
    );


  document
    .getElementById(
      "summary-delivery"
    )
    .textContent =
    delivery === 0
      ? "FREE"
      : formatCurrency(
          delivery
        );


  document
    .getElementById(
      "summary-total"
    )
    .textContent =
    formatCurrency(
      total
    );


  const noteEl =
    document.getElementById(
      "free-delivery-note"
    );


  if (
    APP_CONFIG.freeDeliveryThreshold > 0 &&
    subtotal <
      APP_CONFIG.freeDeliveryThreshold &&
    subtotal > 0
  ) {

    const remaining =
      APP_CONFIG.freeDeliveryThreshold -
      subtotal;


    noteEl.innerHTML = `
      <div class="free-delivery-note">
        Add ${formatCurrency(
          remaining
        )} more for free delivery!
      </div>
    `;

  } else {

    noteEl.innerHTML =
      "";
  }
}


/* -----------------------------------------------------------------------
   Change quantity
   ----------------------------------------------------------------------- */

async function changeQuantity(
  dishId,
  delta
) {

  try {

    const items =
      user
        ? await getCart(user.uid)
        : getGuestCart();


    const current =
      items.find(
        (i) =>
          i.dishId === dishId
      );


    if (!current) {
      return;
    }


    const nextQuantity =
      Number(current.quantity) +
      delta;


    if (user) {

      await updateQuantity(
        user.uid,
        dishId,
        nextQuantity
      );

    } else {

      updateGuestQuantity(
        dishId,
        nextQuantity
      );

    }


    await loadCart();

  } catch (error) {

    console.error(error);

    showError(
      "Couldn't update quantity. Please try again."
    );
  }
}


/* -----------------------------------------------------------------------
   Remove item
   ----------------------------------------------------------------------- */

async function removeItem(
  dishId
) {

  try {

    if (user) {

      await removeFromCart(
        user.uid,
        dishId
      );

    } else {

      removeGuestCartItem(
        dishId
      );

    }


    showSuccess(
      "Item removed from cart."
    );


    await loadCart();

  } catch (error) {

    console.error(error);

    showError(
      "Couldn't remove item. Please try again."
    );
  }
}


/* -----------------------------------------------------------------------
   Checkout
   ----------------------------------------------------------------------- */

checkoutBtn.addEventListener(
  "click",
  () => {

    /*
     * Guest users must login/register
     * before checkout.
     *
     * The redirect parameter makes sure
     * they come back to checkout after
     * authentication.
     */

    if (!user) {

      window.location.href =
        "login.html?redirect=checkout.html";

      return;
    }


    /*
     * Existing authenticated checkout
     * behaviour remains unchanged.
     */

    window.location.href =
      "checkout.html";
  }
);