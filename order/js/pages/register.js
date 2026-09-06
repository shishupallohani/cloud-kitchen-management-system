import { redirectIfAuthenticated } from "../auth-guard.js";
import { registerWithEmail } from "../auth.js";
import { createUserProfile } from "../user-service.js";
import { setButtonLoading, setFieldError, clearFieldError } from "../ui.js";

await redirectIfAuthenticated();

const form = document.getElementById("register-form");
const messageBox = document.getElementById("form-message");
const submitBtn = document.getElementById("register-submit-btn");

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = `auth-form-message auth-form-message--visible auth-form-message--${type}`;
}

function hideMessage() {
  messageBox.className = "auth-form-message";
}

/** Client-side validation. Returns a { field: message } map (empty = valid). */
function validate(data) {
  const errors = {};
  if (!data.name.trim()) errors.name = "Name is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Enter a valid email address.";
  if (!/^\d{10}$/.test(data.mobile.trim())) errors.mobile = "Enter a valid 10-digit mobile number.";
  if (!data.password || data.password.length < 6) errors.password = "Password must be at least 6 characters.";
  if (data.password !== data.confirmPassword) errors.confirmPassword = "Passwords do not match.";
  if (!data.address.trim()) errors.address = "Address is required.";
  if (!data.city.trim()) errors.city = "City is required.";
  return errors;
}

const FIELD_IDS = ["name", "email", "mobile", "password", "confirmPassword", "address", "city"];

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage();
  FIELD_IDS.forEach((id) => clearFieldError(form[id]));

  const data = {
    name: form.name.value,
    email: form.email.value.trim(),
    mobile: form.mobile.value,
    password: form.password.value,
    confirmPassword: form.confirmPassword.value,
    address: form.address.value,
    landmark: form.landmark.value,
    city: form.city.value,
  };

  const errors = validate(data);
  if (Object.keys(errors).length > 0) {
    Object.entries(errors).forEach(([field, msg]) => setFieldError(form[field], msg));
    showMessage("Please fix the highlighted fields.", "error");
    return;
  }

  const restore = setButtonLoading(submitBtn, "Creating account...");

  const authResult = await registerWithEmail(data.email, data.password);
  if (!authResult.success) {
    restore();
    showMessage(authResult.message, "error");
    return;
  }

  try {
    await createUserProfile(authResult.user.uid, data);
    window.location.href = "dashboard.html";
  } catch (error) {
    restore();
    showMessage(
      "Your account was created, but we couldn't save your profile details. Please update them from the Profile page after logging in.",
      "error"
    );
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 2500);
  }
});
