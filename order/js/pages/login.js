import { redirectIfAuthenticated } from "../auth-guard.js";

import { loginWithEmail } from "../auth.js";

import { mergeGuestCart } from "../cart-service.js";

import { setButtonLoading } from "../ui.js";



await redirectIfAuthenticated();



const form =
  document.getElementById("login-form");

const messageBox =
  document.getElementById("form-message");

const submitBtn =
  document.getElementById("login-submit-btn");


/* ================================================================
   LOGOUT FLOW
   ================================================================ */

const logoutParams =
  new URLSearchParams(
    window.location.search
  );

const isLogoutFlow =
  logoutParams.get("loggedOut") === "1";


if (isLogoutFlow) {

  const logoutEmail =
    sessionStorage.getItem(
      "ck-logout-email"
    ) || "";


  /*
   * Restore only the previous email.
   * Password is intentionally cleared.
   */
  const emailInput =
    document.getElementById("email");

  const passwordInput =
    document.getElementById("password");


  if (emailInput) {

    emailInput.value =
      logoutEmail;
  }


  if (passwordInput) {

    passwordInput.value = "";

    passwordInput.autocomplete =
      "new-password";
  }


  /*
   * First visit after logout:
   *
   * Login page is placed immediately before
   * the guest Explore Menu page.
   */
  const logoutPhase =
    sessionStorage.getItem(
      "ck-logout-phase"
    );


  if (logoutPhase !== "guest") {

    sessionStorage.setItem(
      "ck-logout-phase",
      "guest"
    );


    history.pushState(
      {
        charrotiLogoutGuest: true
      },
      "",
      "index.html?logoutGuest=1"
    );


    window.location.reload();

  } else {

    /*
     * We reached the Login page by pressing
     * Browser Back from the guest Explore Menu.
     *
     * Create a temporary history state so that
     * the next Back can be redirected directly
     * to the main Charroti Kitchen website.
     */
    history.pushState(
      {
        charrotiLogoutLogin: true
      },
      "",
      window.location.href
    );


    window.addEventListener(
      "popstate",
      () => {

        sessionStorage.removeItem(
          "ck-logout-email"
        );

        sessionStorage.removeItem(
          "ck-logout-phase"
        );


        document.body.classList.add(
          "page-transition-out"
        );


        setTimeout(() => {

          window.location.replace(
            "../index.html"
          );

        }, 220);

      },
      { once: true }
    );

  }
}



function showMessage(
  text,
  type
) {

  messageBox.textContent =
    text;

  messageBox.className =
    `auth-form-message auth-form-message--visible auth-form-message--${type}`;
}



function hideMessage() {

  messageBox.className =
    "auth-form-message";
}



/* ================================================================
   REDIRECT TARGET
   ================================================================ */

function getRedirectTarget() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const redirect =
    params.get("redirect");


  /*
   * Only allow redirecting back to a
   * same-app HTML page.
   */
  if (
    redirect &&
    /^[a-zA-Z0-9_-]+\.html$/.test(
      redirect
    )
  ) {

    return redirect;
  }


  return "dashboard.html";
}



/* ================================================================
   PRESERVE REDIRECT FOR REGISTER
   ================================================================ */

const registerLink =
  document.querySelector(
    'a[href="register.html"]'
  );


if (registerLink) {

  const target =
    getRedirectTarget();

  registerLink.href =
    `register.html?redirect=${encodeURIComponent(
      target
    )}`;
}



/* ================================================================
   LOGIN
   ================================================================ */

form.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    hideMessage();


    const email =
      form.email.value.trim();

    const password =
      form.password.value;


    if (!email || !password) {

      showMessage(
        "Please enter both email and password.",
        "error"
      );

      return;
    }


    const restore =
      setButtonLoading(
        submitBtn,
        "Logging in..."
      );


    const result =
      await loginWithEmail(
        email,
        password
      );


    /*
     * Login itself failed.
     */
    if (!result.success) {

      restore();

      showMessage(
        result.message,
        "error"
      );

      return;
    }



    /* ============================================================
       MERGE GUEST CART
       ============================================================ */

    try {

      /*
       * If the customer browsed as a guest and
       * added dishes to the cart, move those
       * items into their Firebase cart.
       *
       * If there is no guest cart, this simply
       * does nothing.
       */
      await mergeGuestCart(
        result.user.uid
      );

    } catch (error) {

      console.error(
        "GUEST CART MERGE ERROR:",
        error
      );


      restore();


      showMessage(
        "Logged in successfully, but we couldn't restore your cart. Please open Cart and try again.",
        "error"
      );


      return;
    }


    /*
     * Login was successful.
     *
     * The special logout history flow is no
     * longer needed once the customer logs in.
     */
    sessionStorage.removeItem(
      "ck-logout-email"
    );

    sessionStorage.removeItem(
      "ck-logout-phase"
    );


    restore();


    /*
     * Go back to the page the customer
     * originally wanted.
     *
     * Example:
     *
     * login.html?redirect=checkout.html
     *             ↓
     * checkout.html
     */
    window.location.href =
      getRedirectTarget();

  }
);