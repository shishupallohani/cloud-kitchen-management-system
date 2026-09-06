import { redirectIfAuthenticated } from "../auth-guard.js";
import { registerWithEmail } from "../auth.js";
import { createUserProfile } from "../user-service.js";
import { mergeGuestCart } from "../cart-service.js";
import {
  setButtonLoading,
  setFieldError,
  clearFieldError,
} from "../ui.js";


await redirectIfAuthenticated();


const form =
  document.getElementById("register-form");

const messageBox =
  document.getElementById("form-message");

const submitBtn =
  document.getElementById(
    "register-submit-btn"
  );


function showMessage(text, type) {

  messageBox.textContent = text;

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
   * Only allow simple HTML pages
   * inside the ordering app.
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
   PRESERVE REDIRECT ON LOGIN LINK
   ================================================================ */

const loginLink =
  document.querySelector(
    'a[href="login.html"]'
  );


if (loginLink) {

  const target =
    getRedirectTarget();

  loginLink.href =
    `login.html?redirect=${encodeURIComponent(
      target
    )}`;

}


/* ================================================================
   CLIENT-SIDE VALIDATION
   ================================================================ */

function validate(data) {

  const errors = {};


  if (!data.name.trim()) {

    errors.name =
      "Name is required.";

  }


  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      data.email
    )
  ) {

    errors.email =
      "Enter a valid email address.";

  }


  if (
    !/^\d{10}$/.test(
      data.mobile.trim()
    )
  ) {

    errors.mobile =
      "Enter a valid 10-digit mobile number.";

  }


  if (
    !data.password ||
    data.password.length < 6
  ) {

    errors.password =
      "Password must be at least 6 characters.";

  }


  if (
    data.password !==
    data.confirmPassword
  ) {

    errors.confirmPassword =
      "Passwords do not match.";

  }


  if (!data.address.trim()) {

    errors.address =
      "Address is required.";

  }


  if (!data.city.trim()) {

    errors.city =
      "City is required.";

  }


  return errors;

}


/* ================================================================
   FIELD IDS
   ================================================================ */

const FIELD_IDS = [
  "name",
  "email",
  "mobile",
  "password",
  "confirmPassword",
  "address",
  "city",
];


/* ================================================================
   REGISTER
   ================================================================ */

form.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    hideMessage();


    FIELD_IDS.forEach(
      (id) =>
        clearFieldError(
          form[id]
        )
    );


    const data = {

      name:
        form.name.value,

      email:
        form.email.value.trim(),

      mobile:
        form.mobile.value,

      password:
        form.password.value,

      confirmPassword:
        form.confirmPassword.value,

      address:
        form.address.value,

      landmark:
        form.landmark.value,

      city:
        form.city.value,

    };


    /* ============================================================
       VALIDATION
       ============================================================ */

    const errors =
      validate(data);


    if (
      Object.keys(errors).length > 0
    ) {

      Object.entries(
        errors
      ).forEach(
        ([field, msg]) =>
          setFieldError(
            form[field],
            msg
          )
      );


      showMessage(
        "Please fix the highlighted fields.",
        "error"
      );


      return;
    }


    const restore =
      setButtonLoading(
        submitBtn,
        "Creating account..."
      );


    /* ============================================================
       CREATE FIREBASE ACCOUNT
       ============================================================ */

    const authResult =
      await registerWithEmail(
        data.email,
        data.password
      );


    if (!authResult.success) {

      restore();

      showMessage(
        authResult.message,
        "error"
      );

      return;
    }


    /* ============================================================
       CREATE USER PROFILE
       ============================================================ */

    try {

      await createUserProfile(
        authResult.user.uid,
        data
      );


      /* ==========================================================
         MERGE GUEST CART
         ========================================================== */

      try {

        /*
         * If the customer added dishes before
         * creating an account, restore those
         * items into their new Firebase cart.
         */

        await mergeGuestCart(
          authResult.user.uid
        );

      } catch (mergeError) {

        console.error(
          "GUEST CART MERGE ERROR:",
          mergeError
        );


        restore();


        showMessage(
          "Your account was created, but we couldn't restore your cart. Please open Cart and try again.",
          "error"
        );


        return;
      }


      /*
       * Registration + profile + cart merge
       * are all successful.
       *
       * Return the customer to the page
       * they originally wanted.
       */

      window.location.href =
        getRedirectTarget();


    } catch (error) {

      restore();


      showMessage(
        "Your account was created, but we couldn't save your profile details. Please update them from the Profile page after logging in.",
        "error"
      );


      /*
       * Keep the existing fallback behaviour.
       */

      setTimeout(() => {

        window.location.href =
          getRedirectTarget();

      }, 2500);

    }

  }
);