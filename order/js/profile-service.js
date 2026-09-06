/**
 * profile-service.js
 * -----------------------------------------------------------------------
 * Page-facing domain logic for the "My Profile" screen. This sits on top
 * of user-service.js (raw Firestore CRUD) and adds the validation rules
 * specific to editing a profile, keeping profile.html's controller thin.
 * -----------------------------------------------------------------------
 */

import { getUserProfile, updateUserProfile } from "./user-service.js";

/** Validate the editable profile fields. Returns a { field: message } map (empty = valid). */
export function validateProfileUpdate(data) {
  const errors = {};
  if (!data.name || !data.name.trim()) errors.name = "Name is required.";
  if (!data.mobile || !/^\d{10}$/.test(data.mobile.trim())) {
    errors.mobile = "Enter a valid 10-digit mobile number.";
  }
  if (!data.address || !data.address.trim()) errors.address = "Address is required.";
  if (!data.city || !data.city.trim()) errors.city = "City is required.";
  return errors;
}

/** Fetch the current user's profile for display on the profile page. */
export async function loadProfile(uid) {
  return getUserProfile(uid);
}

/** Validate then persist a profile edit. Throws with a friendly message on invalid input. */
export async function saveProfile(uid, data) {
  const errors = validateProfileUpdate(data);
  if (Object.keys(errors).length > 0) {
    const err = new Error("Please fix the highlighted fields.");
    err.fieldErrors = errors;
    throw err;
  }
  return updateUserProfile(uid, {
    name: data.name.trim(),
    mobile: data.mobile.trim(),
    address: data.address.trim(),
    landmark: (data.landmark || "").trim(),
    city: data.city.trim(),
  });
}
