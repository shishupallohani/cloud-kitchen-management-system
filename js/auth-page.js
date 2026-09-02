import { loginAdmin, getCurrentUser, friendlyAuthError } from "./auth.js";

const form = document.getElementById("login-form");
const errorEl = document.getElementById("login-error");
const submitBtn = document.getElementById("login-submit");

// Already signed in? Skip straight to the dashboard.
getCurrentUser().then((user) => {
  if (user) window.location.href = "admin.html";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "Signing in…";

  const email = form.email.value.trim();
  const password = form.password.value;

  try {
    await loginAdmin(email, password);
    window.location.href = "admin.html";
  } catch (err) {
    errorEl.textContent = friendlyAuthError(err);
    errorEl.hidden = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign In";
  }
});
