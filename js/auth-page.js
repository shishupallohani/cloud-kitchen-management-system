import {
  loginAdmin,
  getCurrentUser,
  isAdminUser,
  friendlyAuthError,
} from "./auth.js";

const form = document.getElementById("login-form");
const errorEl = document.getElementById("login-error");
const submitBtn = document.getElementById("login-submit");

// ------------------------------------------------------------
// Already signed in?
// Only an authorized admin can go directly to Admin Panel.
// Customer accounts must NOT be redirected to admin.html.
// ------------------------------------------------------------
getCurrentUser().then((user) => {
  if (user && isAdminUser(user)) {
    window.location.href = "admin.html";
  }
});


// ------------------------------------------------------------
// Admin login
// ------------------------------------------------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  errorEl.hidden = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "Signing in…";

  const email = form.email.value.trim();
  const password = form.password.value;

  try {
    await loginAdmin(email, password);

    // loginAdmin() only resolves for an authorized admin.
    window.location.href = "admin.html";

  } catch (err) {
    errorEl.textContent = friendlyAuthError(err);
    errorEl.hidden = false;

    submitBtn.disabled = false;
    submitBtn.textContent = "Sign In";
  }
});