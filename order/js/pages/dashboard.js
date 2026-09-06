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
