import { redirectIfAuthenticated } from "../auth-guard.js";
import { sendResetEmail } from "../auth.js";
import { setButtonLoading } from "../ui.js";

await redirectIfAuthenticated();

const form = document.getElementById("forgot-form");
const messageBox = document.getElementById("form-message");
const submitBtn = document.getElementById("forgot-submit-btn");

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = `auth-form-message auth-form-message--visible auth-form-message--${type}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = form.email.value.trim();

  if (!email) {
    showMessage("Please enter your registered email.", "error");
    return;
  }

  const restore = setButtonLoading(submitBtn, "Sending...");
  const result = await sendResetEmail(email);
  restore();

  if (result.success) {
    showMessage("Password reset link sent! Please check your inbox (and spam folder).", "success");
    form.reset();
  } else {
    showMessage(result.message, "error");
  }
});
