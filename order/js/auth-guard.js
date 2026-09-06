/**
 * auth-guard.js
 * -----------------------------------------------------------------------
 * Route protection for the customer ordering application.
 *
 * The main website and the customer ordering app use the same Firebase
 * Authentication project.
 *
 * This guard makes sure an existing admin session is not treated as a
 * customer session inside the ordering app.
 * -----------------------------------------------------------------------
 */

import { onAuthChange } from "./auth.js";

const LOGIN_PAGE = "login.html";
const DASHBOARD_PAGE = "dashboard.html";

// Existing Charroti admin UID from the main website's Firestore rules.
// This is NOT a secret. It is only used here for customer-app UX routing.
// Real authorization is still enforced by Firebase Security Rules.
const ADMIN_UIDS = [
  "8R0axsx0iedUp83VojQW6QUU8nI3",
];

/**
 * Returns true when the Firebase user belongs to the admin account.
 */
function isAdminUser(user) {
  return Boolean(user?.uid && ADMIN_UIDS.includes(user.uid));
}

/**
 * Ensures a customer is logged in before showing a protected page.
 *
 * If no user is authenticated:
 *   → redirect to login.html
 *
 * If the authenticated user is an admin:
 *   → redirect to the main admin panel
 *
 * Otherwise:
 *   → allow the customer page to continue.
 */
export function requireAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthChange((user) => {
      unsubscribe();

      if (!user) {
        const currentPage =
          window.location.pathname.split("/").pop() || "dashboard.html";

        const returnTo = encodeURIComponent(currentPage);

        window.location.replace(
          `${LOGIN_PAGE}?redirect=${returnTo}`
        );

        return;
      }

      if (isAdminUser(user)) {
        window.location.replace("../../admin.html");
        return;
      }

      resolve(user);
    });
  });
}

/**
 * Used by login/register/forgot-password pages.
 *
 * If already authenticated as a customer:
 *   → go to customer dashboard.
 *
 * If authenticated as admin:
 *   → go back to the main admin panel.
 *
 * Otherwise:
 *   → allow the authentication page to load.
 */
export function redirectIfAuthenticated() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthChange((user) => {
      unsubscribe();

      if (!user) {
        resolve(null);
        return;
      }

      if (isAdminUser(user)) {
        window.location.replace("../../admin.html");
        return;
      }

      window.location.replace(DASHBOARD_PAGE);
    });
  });
}