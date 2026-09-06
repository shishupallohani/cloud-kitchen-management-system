/**
 * nav.js
 * -----------------------------------------------------------------------
 * Renders the shared top navigation into a `<div id="app-topnav"></div>`
 * placeholder present on every protected page. Centralising the nav
 * markup here (instead of copy-pasting it into 8 HTML files) means the
 * host website can later swap this one file for its own nav component
 * without touching any page.
 * -----------------------------------------------------------------------
 */

import { APP_CONFIG } from "./config.js";
import { logout } from "./auth.js";
import { showError } from "./ui.js";

const NAV_ITEMS = [
  { key: "dashboard", href: "dashboard.html", label: "Dashboard" },
  { key: "menu", href: "menu.html", label: "Explore Menu" },
  { key: "favorites", href: "favorites.html", label: "Favorites" },
  { key: "cart", href: "cart.html", label: "Cart", showBadge: true },
  { key: "orders", href: "orders.html", label: "My Orders" },
  { key: "profile", href: "profile.html", label: "Profile" },
];

export function renderNav(activeKey) {
  const mount = document.getElementById("app-topnav");
  if (!mount) return;

  const linksHtml = NAV_ITEMS.map((item) => {
    const activeClass = item.key === activeKey ? " nav-link--active" : "";
    const badgeHtml = item.showBadge
      ? `<span class="badge nav-cart-badge" id="nav-cart-badge">0</span>`
      : "";
    return `<a class="nav-link${activeClass}" data-nav-link="${item.key}" href="${item.href}">${item.label}${badgeHtml}</a>`;
  }).join("");

  mount.innerHTML = `
    <nav class="topnav">
      <div class="topnav__inner">
        <a class="topnav__brand" href="dashboard.html">
  <img
    src="assets/images/favicon.png"
    alt="Charroti Kitchen"
    class="topnav__logo"
  />
</a>
        <button type="button" class="topnav__menu-toggle" id="nav-menu-toggle" aria-label="Toggle menu">☰</button>
        <div class="topnav__links" id="nav-links">
          ${linksHtml}
          <a class="nav-link" href="#" id="nav-logout-link">Logout</a>
        </div>
      </div>
    </nav>`;

  document.getElementById("nav-menu-toggle")?.addEventListener("click", () => {
    document.getElementById("nav-links")?.classList.toggle("topnav__links--open");
  });

  document.getElementById("nav-logout-link")?.addEventListener("click", async (event) => {
    event.preventDefault();
    const result = await logout();
    if (result.success) {
      window.location.href = "login.html";
    } else {
      showError(result.message);
    }
  });
}
