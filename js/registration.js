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


  /*
   * Registration navbar link
   */

  const registrationLink =
    document.querySelector('a[href="#registration"]');

  if (registrationLink) {
    registrationLink.addEventListener("click", (event) => {

      event.preventDefault();

      openRegistrationModal();

    });
  }


  /*
   * Close button
   */

  registrationClose.addEventListener(
    "click",
    closeRegistrationModal
  );


  /*
   * Click outside modal
   */

  registrationModal
    .querySelector(".registration-modal__overlay")
    .addEventListener(
      "click",
      closeRegistrationModal
    );


  /*
   * Success popup close
   */

  registrationSuccessClose.addEventListener(
    "click",
    closeSuccessPopup
  );


  /*
   * Registration submit
   *
   * Firebase connection will be added
   * in the next step.
   */

  registrationForm.addEventListener("submit", (event) => {

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


    console.log("Registration data:", {
      name,
      mobile,
      address
    });


    closeRegistrationModal();

    registrationForm.reset();

    openSuccessPopup();

  });

});