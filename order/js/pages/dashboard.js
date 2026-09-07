import { requireAuth } from "../auth-guard.js";
import { renderNav } from "../nav.js";
import { getUserProfile } from "../user-service.js";
import { getCart } from "../cart-service.js";
import { updateCartBadge } from "../ui.js";

const user = await requireAuth();
renderNav("dashboard");

const greetingEl = document.getElementById("dashboard-greeting");
const dashboardBadge = document.getElementById("dashboard-cart-badge");

try {
  const profile = await getUserProfile(user.uid);
  greetingEl.textContent = profile?.name ? `Welcome back, ${profile.name.split(" ")[0]}!` : "Welcome back!";
} catch (error) {
  greetingEl.textContent = "Welcome back!";
}

try {
  const cartItems = await getCart(user.uid);
  const count = cartItems.reduce((sum, item) => sum + Number(item.quantity), 0);
  updateCartBadge(count);
  if (count > 0) {
    dashboardBadge.style.display = "inline-flex";
    dashboardBadge.textContent = String(count);
  }
} catch (error) {
  // Non-critical — badge simply stays hidden if this fails.
}

/*
 * Hero card ticker — a small strip of short, attractive lines with
 * emoji that keep rotating with a smooth 3D flip. The badge emoji
 * above the greeting stays in sync with whichever message is showing.
 * Purely decorative, so if any element isn't found we just skip that
 * part quietly instead of affecting the rest of the dashboard.
 */
/*
 * Each slide is one "frame" of the looping ad. `layout` decides how the
 * screen is composed (center hero line / TV lower-third banner / logo
 * sting), `variant` picks a font style, and `big` makes the emoji a bold
 * 3D moment. All of this plays inside the same ticker element, so
 * nothing else on the page has to change.
 */
const HERO_TICKER_SLIDES = [
  { layout: "center", emoji: "🍛", text: "Freshly cooked, just for you", variant: "rounded" },
  { layout: "lower", emoji: "🔥", text: "Today's specials are hot & ready", variant: "caps", big: true },
  { layout: "brand", emoji: "✨", text: "Charroti Kitchen" },
  { layout: "lower", emoji: "🥗", text: "Healthy bowls, happy taste buds", variant: "serif" },
  { layout: "center", emoji: "🍲", text: "Comfort food, comfort mood", variant: "mono" },
  { layout: "lower", emoji: "⭐", text: "Loved by regulars, made for you", variant: "rounded", big: true },
  { layout: "center", emoji: "🚀", text: "Ordering made ridiculously easy", variant: "caps" },
  { layout: "brand", emoji: "🏆", text: "Taste the Charroti difference" },
  { layout: "lower", emoji: "🌶️", text: "Bold flavours, every single day", variant: "serif" },
];

const HERO_LAYOUT_CLASS = {
  center: "dashboard-hero__ticker--center",
  lower: "dashboard-hero__ticker--lower",
  brand: "dashboard-hero__ticker--brand",
};

const HERO_LAYOUT_ENTER_CLASS = {
  center: "dashboard-hero__ticker--in-center",
  lower: "dashboard-hero__ticker--in-lower",
  brand: "dashboard-hero__ticker--in-brand",
};

/*
 * Treats the hero card as an actual screen: a small blinking "ON AIR"
 * bug plus a full-card flash that fires right as each slide swaps, so
 * changing content reads as "the channel just switched" rather than a
 * plain text update.
 */
function ensureHeroScreenChrome(heroEl) {
  let flashEl = heroEl.querySelector(".dashboard-hero__flash");
  if (!flashEl) {
    flashEl = document.createElement("div");
    flashEl.className = "dashboard-hero__flash";
    flashEl.setAttribute("aria-hidden", "true");
    heroEl.appendChild(flashEl);
  }

  let liveBadgeEl = heroEl.querySelector(".dashboard-hero__live-badge");
  if (!liveBadgeEl) {
    liveBadgeEl = document.createElement("div");
    liveBadgeEl.className = "dashboard-hero__live-badge";
    liveBadgeEl.innerHTML = `<span class="dashboard-hero__live-dot"></span><span>Ad</span>`;
    heroEl.appendChild(liveBadgeEl);
  }

  return { flashEl };
}

function initHeroTicker() {
  const heroEl = document.getElementById("dashboard-hero");
  const tickerEl = document.getElementById("dashboard-hero-ticker");
  const badgeEl = document.getElementById("dashboard-hero-badge");

  if (!tickerEl || !heroEl) return;

  const { flashEl } = ensureHeroScreenChrome(heroEl);

  let index = 0;

  const showNextMessage = () => {
    const slide = HERO_TICKER_SLIDES[index];
    const layoutClass = HERO_LAYOUT_CLASS[slide.layout];
    const enterClass = HERO_LAYOUT_ENTER_CLASS[slide.layout];

    // Fire the "channel change" flash immediately...
    flashEl.classList.remove("dashboard-hero__flash--fire");
    void flashEl.offsetWidth;
    flashEl.classList.add("dashboard-hero__flash--fire");

    // ...and swap the actual content right as the flash peaks, so it
    // genuinely feels like the picture changed mid-flash.
    setTimeout(() => {
      Object.values(HERO_LAYOUT_CLASS).forEach((cls) => tickerEl.classList.remove(cls));
      Object.values(HERO_LAYOUT_ENTER_CLASS).forEach((cls) => tickerEl.classList.remove(cls));
      tickerEl.classList.add(layoutClass);

      const emojiClass = slide.big
        ? "dashboard-hero__ad-emoji dashboard-hero__ad-emoji--big"
        : "dashboard-hero__ad-emoji";

      if (slide.layout === "brand") {
        tickerEl.innerHTML = `
          <img class="dashboard-hero__ad-logo" src="assets/images/favicon.png" alt="" aria-hidden="true" />
          <span class="dashboard-hero__ad-text dashboard-hero__ad-text--brand">${slide.text}</span>
        `;
      } else {
        const textClass = `dashboard-hero__ad-text dashboard-hero__ad-text--${slide.variant || "rounded"}`;
        tickerEl.innerHTML = `
          <span class="${emojiClass}">${slide.emoji}</span>
          <span class="${textClass}">${slide.text}</span>
        `;
      }

      // Force reflow so the entrance animation reliably restarts.
      void tickerEl.offsetWidth;
      tickerEl.classList.add(enterClass);

      if (badgeEl) {
        badgeEl.textContent = slide.emoji;
        badgeEl.classList.toggle("dashboard-hero__badge--pop", Boolean(slide.big) || slide.layout === "brand");
      }
    }, 140);

    index = (index + 1) % HERO_TICKER_SLIDES.length;
  };

  showNextMessage();
  setInterval(showNextMessage, 3000);
}

/*
 * Floating food-emoji particles that continuously drift up from the
 * bottom of the hero card and fade out. Each particle removes itself
 * once its CSS animation finishes, so this never leaks DOM nodes.
 */
const HERO_PARTICLE_EMOJIS = ["🍛", "🍲", "🥗", "🔥", "⭐", "🍚", "🌶️"];

function initHeroParticles() {
  const heroEl = document.getElementById("dashboard-hero");

  if (!heroEl) return;

  const spawnParticle = () => {
    const particle = document.createElement("span");
    particle.className = "dashboard-hero__particle";
    particle.textContent =
      HERO_PARTICLE_EMOJIS[
        Math.floor(Math.random() * HERO_PARTICLE_EMOJIS.length)
      ];
    particle.style.left = `${10 + Math.random() * 80}%`;
    particle.style.animationDuration = `${5 + Math.random() * 3}s`;

    heroEl.appendChild(particle);

    particle.addEventListener("animationend", () => particle.remove());
  };

  spawnParticle();
  setInterval(spawnParticle, 900);
}

initHeroTicker();
// initHeroParticles(); // disabled — replaced by the hero background video
