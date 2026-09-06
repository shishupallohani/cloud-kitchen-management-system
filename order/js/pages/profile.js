import { requireAuth } from "../auth-guard.js";
import { renderNav } from "../nav.js";
import { loadProfile, saveProfile } from "../profile-service.js";
import { sendResetEmail } from "../auth.js";
import { getCart, calculateItemCount } from "../cart-service.js";
import { setButtonLoading, setFieldError, clearFieldError, showError, showSuccess, updateCartBadge } from "../ui.js";

const user = await requireAuth();
renderNav("profile");

const loadingEl = document.getElementById("profile-loading");
const cardEl = document.getElementById("profile-card");
const form = document.getElementById("profile-form");
const messageBox = document.getElementById("form-message");
const saveBtn = document.getElementById("profile-save-btn");
const resetBtn = document.getElementById("profile-reset-password-btn");

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = `auth-form-message auth-form-message--visible auth-form-message--${type}`;
}

function hideMessage() {
  messageBox.className = "auth-form-message";
}

async function init() {
  try {
    const [profile] = await Promise.all([loadProfile(user.uid)]);
    const cartItems = await getCart(user.uid);
    updateCartBadge(calculateItemCount(cartItems));

    document.getElementById("profile-email").value = user.email || "";
    document.getElementById("profile-name").value = profile?.name || "";
    document.getElementById("profile-mobile").value = profile?.mobile || "";
    document.getElementById("profile-address").value = profile?.address || "";
    document.getElementById("profile-landmark").value = profile?.landmark || "";
    document.getElementById("profile-city").value = profile?.city || "";

    loadingEl.style.display = "none";
    cardEl.style.display = "block";
  } catch (error) {
    loadingEl.innerHTML = `<div class="state-panel state-panel--error"><div class="state-panel__icon">⚠️</div><p>We couldn't load your profile. Please refresh the page.</p></div>`;
  }
}

const FIELD_MAP = {
  name: "profile-name",
  mobile: "profile-mobile",
  address: "profile-address",
  city: "profile-city",
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage();
  Object.values(FIELD_MAP).forEach((id) => clearFieldError(document.getElementById(id)));

  const data = {
    name: document.getElementById("profile-name").value,
    mobile: document.getElementById("profile-mobile").value,
    address: document.getElementById("profile-address").value,
    landmark: document.getElementById("profile-landmark").value,
    city: document.getElementById("profile-city").value,
  };

  const restore = setButtonLoading(saveBtn, "Saving...");
  try {
    await saveProfile(user.uid, data);
    showMessage("Profile updated successfully.", "success");
  } catch (error) {
    if (error.fieldErrors) {
      Object.entries(error.fieldErrors).forEach(([field, msg]) => {
        const inputId = FIELD_MAP[field];
        if (inputId) setFieldError(document.getElementById(inputId), msg);
      });
    }
    showMessage(error.message || "Couldn't update profile.", "error");
  } finally {
    restore();
  }
});

resetBtn.addEventListener("click", async () => {
  const restore = setButtonLoading(resetBtn, "Sending...");
  const result = await sendResetEmail(user.email);
  restore();
  if (result.success) {
    showSuccess("Password reset email sent. Please check your inbox.");
  } else {
    showError(result.message);
  }
});

init();
