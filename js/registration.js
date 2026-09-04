import { db } from "./firebase.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";


document.addEventListener("DOMContentLoaded", () => {

  const registrationModal =
    document.getElementById("registration-modal");

  const registrationClose =
    document.getElementById("registration-close");

  const registrationForm =
    document.getElementById("registration-form");

  const registrationSuccess =
    document.getElementById("registration-success");

  const registrationSuccessClose =
    document.getElementById("registration-success-close");


  function openRegistrationModal() {
    registrationModal.classList.add("is-open");
    registrationModal.setAttribute("aria-hidden", "false");
  }


  function closeRegistrationModal() {
    registrationModal.classList.remove("is-open");
    registrationModal.setAttribute("aria-hidden", "true");
  }


  function openSuccessPopup() {
    registrationSuccess.classList.add("is-open");
    registrationSuccess.setAttribute("aria-hidden", "false");
  }


  function closeSuccessPopup() {
    registrationSuccess.classList.remove("is-open");
    registrationSuccess.setAttribute("aria-hidden", "true");
  }


  // Registration navbar link
  const registrationLink =
    document.querySelector('a[href="#registration"]');

  if (registrationLink) {
    registrationLink.addEventListener("click", (event) => {
      event.preventDefault();
      openRegistrationModal();
    });
  }


  // Close button
  registrationClose.addEventListener(
    "click",
    closeRegistrationModal
  );


  // Click outside modal
  registrationModal
    .querySelector(".registration-modal__overlay")
    .addEventListener(
      "click",
      closeRegistrationModal
    );


  // Success popup close
  registrationSuccessClose.addEventListener(
    "click",
    closeSuccessPopup
  );


  // Submit registration
  registrationForm.addEventListener("submit", async (event) => {

    event.preventDefault();


    const name =
      document.getElementById("registration-name").value.trim();

    const mobile =
      document.getElementById("registration-mobile").value.trim();

    const address =
      document.getElementById("registration-address").value.trim();


    if (!name || !mobile || !address) {
      return;
    }


    if (!/^[0-9]{10}$/.test(mobile)) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }


    try {

      const customerRef =
        doc(db, "customers", mobile);


      await setDoc(customerRef, {

        name: name,
        mobile: mobile,
        address: address,
        createdAt: serverTimestamp()

      });


      console.log("Customer registered successfully");


      closeRegistrationModal();

      registrationForm.reset();

      openSuccessPopup();


    } catch (error) {

      console.error("Registration failed:", error);

      alert("Registration failed. Please try again.");

    }

  });

});