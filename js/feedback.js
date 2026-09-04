import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ============================================================
// CUSTOMER REVIEW MODAL
// ============================================================

const reviewModal = document.getElementById("review-modal");
const reviewCloseBtn = document.querySelector("[data-close-review]");
const reviewStars = document.querySelectorAll("#review-stars button");
const reviewRatingInput = document.getElementById("review-rating");
const reviewText = document.getElementById("review-text");
const quickReviewButtons = document.querySelectorAll("[data-quick-review]");


// ------------------------------------------------------------
// Open Review Modal
// ------------------------------------------------------------

document.querySelectorAll("[data-open-review]").forEach((button) => {

  button.addEventListener("click", (event) => {
    event.preventDefault();

      // Default rating = 1 star
  reviewRatingInput.value = "1";

  reviewStars.forEach((star) => {
    star.classList.toggle(
      "is-selected",
      Number(star.dataset.rating) === 1
    );
  });

    reviewModal.hidden = false;
    document.body.style.overflow = "hidden";
  });

});


// ------------------------------------------------------------
// Close Review Modal
// ------------------------------------------------------------

function closeReviewModal() {
  reviewModal.hidden = true;
  document.body.style.overflow = "";
}

reviewCloseBtn.addEventListener("click", closeReviewModal);


// Close when clicking outside card

reviewModal.addEventListener("click", (event) => {

  if (event.target === reviewModal) {
    closeReviewModal();
  }

});


// Close with Escape key

document.addEventListener("keydown", (event) => {

  if (event.key === "Escape" && !reviewModal.hidden) {
    closeReviewModal();
  }

});


// ------------------------------------------------------------
// Star Rating
// ------------------------------------------------------------

reviewStars.forEach((star) => {

  star.addEventListener("click", () => {

    const rating = Number(star.dataset.rating);

    reviewRatingInput.value = rating;

    reviewStars.forEach((item) => {

      const itemRating = Number(item.dataset.rating);

      item.classList.toggle(
        "is-selected",
        itemRating <= rating
      );

    });

  });

});


// ------------------------------------------------------------
// Quick Reviews
// ------------------------------------------------------------

quickReviewButtons.forEach((button) => {

  button.addEventListener("click", () => {

    const review = button.dataset.quickReview;

    reviewText.value = review;

    quickReviewButtons.forEach((item) => {
      item.classList.remove("is-selected");
    });

    button.classList.add("is-selected");

  });

});


// ------------------------------------------------------------
// Submit Review
// ------------------------------------------------------------

const reviewSubmitBtn = document.getElementById("review-submit");

reviewSubmitBtn.addEventListener("click", async () => {

  const rating = Number(reviewRatingInput.value);
  const review = reviewText.value.trim();

  // Validation
  if (!rating) {
    alert("Please select a rating.");
    return;
  }

  if (!review) {
    alert("Please write a review.");
    return;
  }

  reviewSubmitBtn.disabled = true;
  reviewSubmitBtn.textContent = "Submitting...";

  try {

    await addDoc(collection(db, "reviewStatus"), {
      rating: rating,
      review: review,
      status: "pending",
      submittedAt: serverTimestamp()
    });

   openReviewSuccess();

    // Reset form
    reviewRatingInput.value = "";
    reviewText.value = "";

    reviewStars.forEach((star) => {
      star.classList.remove("is-selected");
    });

    quickReviewButtons.forEach((button) => {
      button.classList.remove("is-selected");
    });

    closeReviewModal();

  } catch (error) {

    console.error("Review submission failed:", error);

    alert(
      "Couldn't submit your review. Please try again."
    );

  } finally {

    reviewSubmitBtn.disabled = false;
    reviewSubmitBtn.textContent = "Submit Review";

  }

});

const reviewSuccess = document.getElementById("review-success");
const reviewSuccessClose =
  document.getElementById("review-success-close");

function openReviewSuccess() {
  reviewSuccess.hidden = false;
}

reviewSuccessClose.addEventListener("click", () => {
  reviewSuccess.hidden = true;
});