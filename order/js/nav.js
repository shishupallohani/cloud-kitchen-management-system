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
 *   Header shows the logo on the left and Logout on the right.
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
   Logout handler
   ----------------------------------------------------------------------- */

function bindLogout(id) {

  document
    .getElementById(id)
    ?.addEventListener(
      "click",
      async (event) => {

        event.preventDefault();

        const result =
          await logout();

        if (result.success) {

          window.location.href =
            "login.html";

        } else {

          showError(
            result.message
          );
        }
      }
    );
}


/* -----------------------------------------------------------------------
   Render navigation
   ----------------------------------------------------------------------- */

export function renderNav(activeKey) {

  const mount =
    document.getElementById(
      "app-topnav"
    );

  if (!mount) {
    return;
  }


  const isDashboard =
    activeKey === "dashboard";


  const linksHtml =
    NAV_ITEMS
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
          href="dashboard.html"
          aria-label="Charroti Kitchen Dashboard"
        >

          <img
            src="assets/images/favicon.png"
            alt="Charroti Kitchen"
            class="topnav__logo"
          />

        </a>


        <!-- Universal mobile logout -->

        <div
          class="topnav__mobile-logout"
        >

          ${logoutMarkup(
            "mobile-logout-link"
          )}

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

          ${logoutMarkup(
            "nav-logout-link"
          )}

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


  bindLogout(
    "nav-logout-link"
  );


  bindLogout(
    "mobile-logout-link"
  );

}