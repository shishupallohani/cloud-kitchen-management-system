/**
 * app.js
 * -----------------------------------------------------------------------
 * Entry point for the public website (index.html). Handles navigation,
 * the static Kitchen Favorites catalog, contact info, and wires up the
 * daily menu + festival modules.
 * -----------------------------------------------------------------------
 */

import { SITE, STATIC_CATALOG, CATEGORIES } from "./config.js";
import { toDateKey, fetchMenuForDate, renderTodaysMenu } from "./menu.js";
import { initFestivalTheme } from "./festival.js";

// ---------------------------------------------------------------------
// Brand + contact — fill from config so there's one place to edit
// ---------------------------------------------------------------------
function applySiteCopy() {
  document.title = `${SITE.brandName} ${SITE.brandTagline} — Homestyle Indian Food, Fresh Every Day`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", SITE.metaDescription);

  document.querySelectorAll("[data-brand-name]").forEach((el) => {
    el.textContent = SITE.brandName;
  });
  document.querySelectorAll("[data-brand-tagline]").forEach((el) => {
    el.textContent = SITE.brandTagline;
  });
  document.querySelectorAll("[data-contact-phone]").forEach((el) => {
    el.textContent = SITE.contact.phone;
    if (el.tagName === "A") el.href = `tel:${SITE.contact.phone.replace(/\s+/g, "")}`;
  });
  document.querySelectorAll("[data-contact-email]").forEach((el) => {
    el.textContent = SITE.contact.email;
    if (el.tagName === "A") el.href = `mailto:${SITE.contact.email}`;
  });
  document.querySelectorAll("[data-contact-location]").forEach((el) => {
    el.textContent = SITE.contact.location;
  });
  document.querySelectorAll("[data-contact-hours]").forEach((el) => {
    el.textContent = SITE.contact.hours;
  });
  document.querySelectorAll("[data-contact-whatsapp]").forEach((el) => {
    el.href = `https://wa.me/${SITE.contact.whatsapp}`;
  });
}

// ---------------------------------------------------------------------
// Navigation: sticky bar, mobile menu, active-section indication
// ---------------------------------------------------------------------
function initNav() {
  const nav = document.querySelector(".nav");
  const toggle = document.querySelector(".nav__toggle");
  const links = document.querySelector(".nav__links");

  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const isOpen = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        links.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  window.addEventListener(
    "scroll",
    () => {
      nav?.classList.toggle("nav--scrolled", window.scrollY > 12);
    },
    { passive: true }
  );

  const sections = document.querySelectorAll("main section[id]");
  const navAnchors = document.querySelectorAll(".nav__links a");
  if (sections.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navAnchors.forEach((a) => {
            a.classList.toggle(
              "is-active",
              a.getAttribute("href") === `#${entry.target.id}`
            );
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
  }
}

// ---------------------------------------------------------------------
// Scroll-reveal (single, restrained pattern — not per-card fade spam)
// ---------------------------------------------------------------------
function initScrollReveal() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targets = document.querySelectorAll("[data-reveal]");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-revealed"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  targets.forEach((el) => observer.observe(el));
}

// ---------------------------------------------------------------------
// Kitchen Favorites catalog + category filter
// ---------------------------------------------------------------------
function catalogCard(item) {
  const fallbackImage = item.image.replace(/\.jpg$/i, ".svg");
  return `
    <li class="food-card" data-category="${item.category}">
      <div class="food-card__media">
        <img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImage}'" />
      </div>
      <div class="food-card__body">
        <h3>${item.name}</h3>
        <p>${item.description}</p>
        <span class="food-card__tag">${item.category}</span>
      </div>
    </li>`;
}

function initCatalog() {
  const grid = document.getElementById("catalog-grid");
  const filterBar = document.getElementById("catalog-filters");
  if (!grid) return;

  grid.innerHTML = STATIC_CATALOG.map(catalogCard).join("");
  grid.classList.add("is-revealed");

  if (filterBar) {
    filterBar.innerHTML = CATEGORIES.map(
      (cat, i) =>
        `<button type="button" class="filter-pill${
          i === 0 ? " is-active" : ""
        }" data-filter="${cat}">${cat}</button>`
    ).join("");

    filterBar.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-pill");
      if (!btn) return;
      filterBar
        .querySelectorAll(".filter-pill")
        .forEach((b) => b.classList.toggle("is-active", b === btn));
      const filter = btn.dataset.filter;
      grid.querySelectorAll(".food-card").forEach((card) => {
        const match = filter === "All" || card.dataset.category === filter;
        card.classList.toggle("is-hidden", !match);
      });
    });
  }
}

// ---------------------------------------------------------------------
// Today's Menu
// ---------------------------------------------------------------------
async function initTodaysMenu() {
  const container = document.getElementById("todays-menu-list");
  if (!container) return;
  const dateKey = toDateKey();
  try {
    const menu = await fetchMenuForDate(dateKey);
    renderTodaysMenu(container, menu, dateKey);
  } catch (err) {
    console.error("Failed to load today's menu:", err);
    container.innerHTML = `
      <div class="menu-empty">
        <p>We couldn't load today's menu right now.</p>
        <p class="menu-empty__sub">Please refresh, or call us and we'll tell you what's cooking.</p>
      </div>`;
  }
}

// ---------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  applySiteCopy();
  initNav();
  initScrollReveal();
  initCatalog();
  initTodaysMenu();
  initFestivalTheme();

  const yearEl = document.getElementById("current-year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
});
