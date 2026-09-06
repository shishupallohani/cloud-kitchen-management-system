import { redirectIfAuthenticated } from "../auth-guard.js";
import { loginWithEmail } from "../auth.js";
import { setButtonLoading } from "../ui.js";

await redirectIfAuthenticated();

const form = document.getElementById("login-form");
const messageBox = document.getElementById("form-message");
const submitBtn = document.getElementById("login-submit-btn");

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = `auth-form-message auth-form-message--visible auth-form-message--${type}`;
}

function hideMessage() {
  messageBox.className = "auth-form-message";
}

function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  // Only allow redirecting back to a same-app page, never an external URL.
  if (redirect && /^[a-zA-Z0-9_-]+\.html$/.test(redirect)) {
    return redirect;
  }
  return "dashboard.html";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage();

  const email = form.email.value.trim();
  const password = form.password.value;

  if (!email || !password) {
    showMessage("Please enter both email and password.", "error");
    return;
  }

  const restore = setButtonLoading(submitBtn, "Logging in...");
  const result = await loginWithEmail(email, password);
  restore();

  if (result.success) {
    window.location.href = getRedirectTarget();
  } else {
    showMessage(result.message, "error");
  }
});
