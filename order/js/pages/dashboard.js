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
const HERO_TICKER_MESSAGES = [
  { emoji: "🍛", text: "Freshly cooked, just for you" },
  { emoji: "🔥", text: "Today's specials are hot & ready" },
  { emoji: "🥗", text: "Healthy bowls, happy taste buds" },
  { emoji: "🍲", text: "Comfort food, comfort mood" },
  { emoji: "⭐", text: "Loved by regulars, made for you" },
];

function initHeroTicker() {
  const tickerEl = document.getElementById("dashboard-hero-ticker");
  const badgeEl = document.getElementById("dashboard-hero-badge");

  if (!tickerEl) return;

  let index = 0;

  const showNextMessage = () => {
    const message = HERO_TICKER_MESSAGES[index];

    tickerEl.classList.remove("dashboard-hero__ticker--in");

    // Force reflow so the animation reliably restarts every cycle.
    void tickerEl.offsetWidth;

    tickerEl.textContent = message.text;
    tickerEl.classList.add("dashboard-hero__ticker--in");

    if (badgeEl) {
      badgeEl.textContent = message.emoji;
    }

    index = (index + 1) % HERO_TICKER_MESSAGES.length;
  };

  showNextMessage();
  setInterval(showNextMessage, 2600);
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
initHeroParticles();
