/**
 * nav.js
 * -----------------------------------------------------------------------
 * Shared navigation for the customer ordering UI.
 *
 * Desktop:
 *   Keeps the existing horizontal navigation style.
 *
 * Mobile:
 *   Uses polished 2D navigation cards with icons + labels.
 *   The current page remains visible and selected.
 *
 * All pages:
 *   Header shows the logo on the left.
 *
 * Logged-in users:
 *   Header shows Logout on the right.
 *
 * Guest users:
 *   Header shows Login on the right.
 *   Guest navigation contains only Explore Menu + Cart + Login.
 *
 * Logout:
 *   Shows a small custom confirmation popup before signing out.
 *   Popup follows the active website/order theme.
 *
 * Dashboard mobile:
 *   Keeps the dashboard itself untouched.
 * -----------------------------------------------------------------------
 */

import { logout } from "./auth.js";
import { showError } from "./ui.js";


const NAV_ITEMS = [

  {
    key: "dashboard",
    href: "dashboard.html",
    label: "Dashboard",

    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5"></path>
        <path d="M5 9.5V21h14V9.5"></path>
        <path d="M9 21v-6h6v6"></path>
      </svg>
    `,
  },


  {
    key: "menu",
    href: "menu.html",
    label: "Explore Menu",

    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3v7"></path>
        <path d="M4 3v4c0 1.1.9 2 2 2s2-.9 2-2V3"></path>
        <path d="M6 9v12"></path>
        <path d="M14 3v18"></path>
        <path d="M14 3c3 0 5 2.2 5 5s-2 5-5 5"></path>
      </svg>
    `,
  },


  {
    key: "favorites",
    href: "favorites.html",
    label: "Favorites",

    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.8 8.7c0 5.2-8.8 10.3-8.8 10.3S3.2 13.9 3.2 8.7A4.7 4.7 0 0 1 12 6.3a4.7 4.7 0 0 1 8.8 2.4Z"></path>
      </svg>
    `,
  },


  {
    key: "cart",
    href: "cart.html",
    label: "Cart",
    showBadge: true,

    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L20 8H6"></path>
        <circle cx="10" cy="20" r="1.5"></circle>
        <circle cx="18" cy="20" r="1.5"></circle>
      </svg>
    `,
  },


  {
    key: "orders",
    href: "orders.html",
    label: "My Orders",

    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3h12v18H6z"></path>
        <path d="M9 7h6M9 11h6M9 15h4"></path>
      </svg>
    `,
  },


  {
    key: "profile",
    href: "profile.html",
    label: "Profile",

    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="4"></circle>
        <path d="M4 21a8 8 0 0 1 16 0"></path>
      </svg>
    `,
  },

];


const LOGOUT_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <path d="M16 17l5-5-5-5"></path>
    <path d="M21 12H9"></path>
  </svg>
`;


const LOGIN_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 4h10v16H9"></path>
    <path d="M13 12H3"></path>
    <path d="m7 8-4 4 4 4"></path>
  </svg>
`;


/* -----------------------------------------------------------------------
   Login markup
   ----------------------------------------------------------------------- */

function loginMarkup() {

  return `
    <a
      class="nav-link nav-link--login"
      href="login.html"
      data-nav-link="login"
    >

      <span
        class="nav-link__icon"
        aria-hidden="true"
      >
        ${LOGIN_ICON}
      </span>

      <span class="nav-link__label">
        Login
      </span>

    </a>
  `;
}


/* -----------------------------------------------------------------------
   Logout markup
   ----------------------------------------------------------------------- */

function logoutMarkup(id) {

  return `
    <a
      class="nav-link nav-link--logout"
      href="#"
      id="${id}"
      data-nav-logout
    >

      <span class="nav-link__icon nav-link__logout-icon">
        ${LOGOUT_ICON}
      </span>

      <span class="nav-link__label">
        Logout
      </span>

    </a>
  `;
}


/* -----------------------------------------------------------------------
   Logout confirmation popup styles
   ----------------------------------------------------------------------- */

function ensureLogoutModalStyles() {

  if (document.getElementById("logout-confirm-styles")) {
    return;
  }


  const style = document.createElement("style");

  style.id = "logout-confirm-styles";

  style.textContent = `

    .logout-confirm-overlay {

      position: fixed;

      inset: 0;

      z-index: 9999;

      display: flex;

      align-items: center;

      justify-content: center;

      padding: 20px;

      background: rgba(0, 0, 0, 0.42);

      backdrop-filter: blur(3px);

      -webkit-backdrop-filter: blur(3px);

      animation: logoutOverlayIn 0.16s ease-out;
    }


    .logout-confirm {

      width: min(100%, 330px);

      padding: 24px 22px 20px;

      background: var(--color-surface);

      color: var(--color-text);

      border: 1px solid var(--color-border);

      border-radius: 18px;

      box-shadow:
        0 18px 45px rgba(0, 0, 0, 0.20);

      text-align: center;

      animation: logoutPopupIn 0.18s ease-out;
    }


    .logout-confirm__icon {

      width: 46px;

      height: 46px;

      margin: 0 auto 13px;

      display: flex;

      align-items: center;

      justify-content: center;

      border-radius: 14px;

      background: var(--color-primary-light);

      color: var(--color-primary-dark);

      box-shadow:
        inset 0 0 0 1px var(--color-border);
    }


    .logout-confirm__icon svg {

      width: 23px;

      height: 23px;

      fill: none;

      stroke: currentColor;

      stroke-width: 1.8;

      stroke-linecap: round;

      stroke-linejoin: round;
    }


    .logout-confirm__title {

      margin: 0 0 7px;

      font-size: 1.08rem;

      line-height: 1.3;

      font-weight: 800;

      color: var(--color-text);
    }


    .logout-confirm__message {

      margin: 0;

      font-size: 0.84rem;

      line-height: 1.5;

      color: var(--color-text-muted);
    }


    .logout-confirm__actions {

      display: flex;

      gap: 9px;

      margin-top: 19px;
    }


    .logout-confirm__button {

      flex: 1;

      min-height: 40px;

      padding: 8px 13px;

      border-radius: 10px;

      border: 1px solid var(--color-border);

      background: var(--color-surface);

      color: var(--color-text);

      font-family: inherit;

      font-size: 0.82rem;

      font-weight: 700;

      cursor: pointer;

      transition:
        transform 0.15s ease,
        box-shadow 0.15s ease,
        background 0.15s ease,
        border-color 0.15s ease;
    }


    .logout-confirm__button:hover {

      transform: translateY(-1px);

      box-shadow: var(--shadow-sm);

      border-color: var(--color-primary);
    }


    .logout-confirm__button--logout {

      background: var(--color-primary);

      border-color: var(--color-primary);

      color: #fff;

      box-shadow: var(--shadow-sm);
    }


    .logout-confirm__button--logout:hover {

      background: var(--color-primary-dark);

      border-color: var(--color-primary-dark);

      color: #fff;

      box-shadow: var(--shadow-md);
    }


    @keyframes logoutOverlayIn {

      from {
        opacity: 0;
      }

      to {
        opacity: 1;
      }
    }


    @keyframes logoutPopupIn {

      from {

        opacity: 0;

        transform: scale(0.94) translateY(6px);
      }

      to {

        opacity: 1;

        transform: scale(1) translateY(0);
      }
    }


    @media (max-width: 480px) {

      .logout-confirm {

        width: min(100%, 310px);

        padding: 21px 18px 18px;

        border-radius: 16px;
      }

      .logout-confirm__actions {

        margin-top: 17px;
      }
    }

  `;


  document.head.appendChild(style);
}


/* -----------------------------------------------------------------------
   Close logout popup
   ----------------------------------------------------------------------- */

function closeLogoutModal() {

  const overlay =
    document.getElementById(
      "logout-confirm-overlay"
    );

  if (overlay) {
    overlay.remove();
  }

  document.body.style.overflow = "";
}


/* -----------------------------------------------------------------------
   Show logout confirmation popup
   ----------------------------------------------------------------------- */

function showLogoutConfirmation() {

  /*
   * Prevent duplicate popup.
   */

  if (
    document.getElementById(
      "logout-confirm-overlay"
    )
  ) {
    return;
  }


  ensureLogoutModalStyles();


  const overlay =
    document.createElement("div");

  overlay.id =
    "logout-confirm-overlay";

  overlay.className =
    "logout-confirm-overlay";

  overlay.setAttribute(
    "role",
    "dialog"
  );

  overlay.setAttribute(
    "aria-modal",
    "true"
  );

  overlay.setAttribute(
    "aria-labelledby",
    "logout-confirm-title"
  );


  overlay.innerHTML = `

    <div
      class="logout-confirm"
      role="document"
    >

      <div
        class="logout-confirm__icon"
        aria-hidden="true"
      >
        ${LOGOUT_ICON}
      </div>


      <h3
        class="logout-confirm__title"
        id="logout-confirm-title"
      >
        Logout?
      </h3>


      <p class="logout-confirm__message">
        Are you sure you want to logout?
      </p>


      <div class="logout-confirm__actions">

        <button
          type="button"
          class="logout-confirm__button"
          id="logout-cancel-btn"
        >
          Cancel
        </button>


        <button
          type="button"
          class="logout-confirm__button logout-confirm__button--logout"
          id="logout-confirm-btn"
        >
          Logout
        </button>

      </div>

    </div>

  `;


  document.body.appendChild(
    overlay
  );


  /*
   * Prevent background page scrolling
   * while the popup is open.
   */

  document.body.style.overflow =
    "hidden";


  document
    .getElementById(
      "logout-cancel-btn"
    )
    ?.addEventListener(
      "click",
      () => {

        closeLogoutModal();

      }
    );


  document
    .getElementById(
      "logout-confirm-btn"
    )
    ?.addEventListener(
      "click",
      async () => {

        const button =
          document.getElementById(
            "logout-confirm-btn"
          );

        if (button) {

          button.disabled = true;

          button.textContent =
            "Logging out...";
        }


        const result =
          await logout();


        if (result.success) {

          window.location.href =
            "login.html";

          return;
        }


        closeLogoutModal();

        showError(
          result.message
        );
      }
    );


  /*
   * Clicking outside the small popup
   * closes the confirmation.
   */

  overlay.addEventListener(
    "click",
    (event) => {

      if (
        event.target === overlay
      ) {

        closeLogoutModal();

      }
    }
  );


  /*
   * ESC key closes the popup.
   */

  const handleEscape =
    (event) => {

      if (
        event.key === "Escape"
      ) {

        closeLogoutModal();

        document.removeEventListener(
          "keydown",
          handleEscape
        );
      }
    };


  document.addEventListener(
    "keydown",
    handleEscape
  );


  /*
   * Automatically focus Cancel
   * so accidental Enter does not
   * immediately logout.
   */

  document
    .getElementById(
      "logout-cancel-btn"
    )
    ?.focus();
}


/* -----------------------------------------------------------------------
   Logout handler
   ----------------------------------------------------------------------- */

function bindLogout(id) {

  document
    .getElementById(id)
    ?.addEventListener(
      "click",
      (event) => {

        event.preventDefault();

        showLogoutConfirmation();

      }
    );
}


/* -----------------------------------------------------------------------
   Render navigation
   ----------------------------------------------------------------------- */

export function renderNav(activeKey, options = {}) {

  const mount =
    document.getElementById(
      "app-topnav"
    );

  if (!mount) {
    return;
  }


  const isGuest =
    options.guest === true;


  const isDashboard =
    activeKey === "dashboard";


  /*
   * Guest users can browse only the
   * Explore Menu and Cart sections.
   *
   * Favorites, Orders, Profile and
   * Dashboard remain account-only.
   */

  const visibleNavItems =
    isGuest
      ? NAV_ITEMS.filter(
          (item) =>
            item.key === "menu" ||
            item.key === "cart"
        )
      : NAV_ITEMS;


  const linksHtml =
    visibleNavItems
      .map((item) => {

        const isActive =
          item.key === activeKey;


        const activeClass =
          isActive
            ? " nav-link--active nav-link--current-page"
            : "";


        const currentAttribute =
          isActive
            ? ' aria-current="page"'
            : "";


        const badgeHtml =
          item.showBadge
            ? `
              <span
                class="badge nav-cart-badge"
                id="nav-cart-badge"
              >
                0
              </span>
            `
            : "";


        return `
          <a
            class="nav-link${activeClass}"
            data-nav-link="${item.key}"
            href="${item.href}"
            ${currentAttribute}
          >

            <span
              class="nav-link__icon"
              aria-hidden="true"
            >
              ${item.icon}
            </span>

            <span class="nav-link__label">
              ${item.label}
            </span>

            ${badgeHtml}

          </a>
        `;
      })
      .join("");


  mount.innerHTML = `

    <nav
      class="topnav${isDashboard ? " topnav--dashboard" : ""}"
    >

      <div class="topnav__inner">


        <!-- Logo -->

        <a
          class="topnav__brand"
          href="${isGuest ? "index.html" : "dashboard.html"}"
          aria-label="Charroti Kitchen"
        >

          <img
            src="assets/images/favicon.png"
            alt="Charroti Kitchen"
            class="topnav__logo"
          />

        </a>


        <!-- Universal mobile logout / login -->

        <div
          class="topnav__mobile-logout"
        >

          ${
            isGuest
              ? loginMarkup()
              : logoutMarkup(
                  "mobile-logout-link"
                )
          }

        </div>


        <!-- Existing hamburger kept in DOM for desktop compatibility.
             Mobile CSS hides it. -->

        <button
          type="button"
          class="topnav__menu-toggle"
          id="nav-menu-toggle"
          aria-label="Toggle menu"
          aria-controls="nav-links"
          aria-expanded="false"
        >
          ☰
        </button>


        <!-- Main navigation -->

        <div
          class="topnav__links"
          id="nav-links"
        >

          ${linksHtml}

          ${
            isGuest
              ? loginMarkup()
              : logoutMarkup(
                  "nav-logout-link"
                )
          }

        </div>


      </div>

    </nav>
  `;


  /* ---------------------------------------------------------------------
     Existing hamburger behaviour retained.
     CSS hides it in the new mobile layout.
     --------------------------------------------------------------------- */

  document
    .getElementById(
      "nav-menu-toggle"
    )
    ?.addEventListener(
      "click",
      () => {

        const links =
          document.getElementById(
            "nav-links"
          );

        const toggle =
          document.getElementById(
            "nav-menu-toggle"
          );


        const isOpen =
          links
            ?.classList
            .toggle(
              "topnav__links--open"
            ) ?? false;


        toggle?.setAttribute(
          "aria-expanded",
          String(isOpen)
        );
      }
    );


  /*
   * Logout is available only for
   * authenticated customers.
   */

  if (!isGuest) {

    bindLogout(
      "nav-logout-link"
    );


    bindLogout(
      "mobile-logout-link"
    );

  }

}