import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const reviewList = document.getElementById("customer-reviews-list");

// ============================================================
// DESKTOP TOP 3 REVIEWS
// ============================================================

const TOP_REVIEW_IDS = [
  "04KZmPw3igXaWfLfXKrM","1gjnCwulopAGOLFhgWLB","AwcdZUovKE0JpJHn1rZH"
];

async function loadCustomerReviews() {

  if (!reviewList) return;

  reviewList.innerHTML = "";

  if (!TOP_REVIEW_IDS.length) {
    return;
  }

  for (const reviewId of TOP_REVIEW_IDS) {

    try {

      const reviewRef = doc(
        db,
        "publicReviews",
        reviewId
      );

      const reviewSnap = await getDoc(reviewRef);

      if (!reviewSnap.exists()) {
        continue;
      }

      const review = reviewSnap.data();

      if (!review.name || !review.review || !review.rating) {
        continue;
      }

      const card = document.createElement("article");

      card.className = "ck-review-card";

      card.innerHTML = `
        <div>

          <div class="ck-review-card__rating"
               aria-label="${review.rating} out of 5 stars">
            ${"★".repeat(review.rating)}
          </div>

          <p class="ck-review-card__text">
            ${review.review}
          </p>

        </div>

        <div class="ck-review-card__customer">
          — ${review.name}
        </div>
      `;

      reviewList.appendChild(card);

    } catch (error) {

      console.error(
        `Couldn't load review ${reviewId}:`,
        error
      );

    }
  }
}

loadCustomerReviews();

// ================= MOBILE CUSTOMER REVIEWS =================

const mobileReviewsModal = document.getElementById(
  "mobile-customer-reviews-modal"
);

const mobileReviewsClose = document.getElementById(
  "mobile-customer-reviews-close"
);

const mobileReviewsList = document.getElementById(
  "mobile-customer-reviews-list"
);

const mobileReviewsAverage = document.getElementById(
  "mobile-reviews-average"
);

const mobileReviewsAverageStars = document.getElementById(
  "mobile-reviews-average-stars"
);

const mobileReviewsCount = document.getElementById(
  "mobile-reviews-count"
);

const customerReviewsLinks = document.querySelectorAll(
  'a[href="#customer-reviews"]'
);

customerReviewsLinks.forEach((link) => {

  link.addEventListener("click", async (event) => {

    if (window.innerWidth > 767) {
      return;
    }

    event.preventDefault();

    mobileReviewsModal.hidden = false;

    // Lock background page scrolling
    document.body.style.overflow = "hidden";

    await loadMobileCustomerReviews();

  });

});


// Close modal
mobileReviewsClose?.addEventListener("click", () => {

  mobileReviewsModal.hidden = true;

  // Restore background page scrolling
  document.body.style.overflow = "";

});


// Load all approved reviews
async function loadMobileCustomerReviews() {

  if (!mobileReviewsList) return;

  mobileReviewsList.innerHTML = "";

  try {

    const reviewsSnapshot = await getDocs(
      collection(db, "publicReviews")
    );

    const reviews = [];

    reviewsSnapshot.forEach((docSnap) => {

      const review = docSnap.data();

      if (
        review.name &&
        review.review &&
        review.rating
      ) {
        reviews.push(review);
      }

    });


    // Total review count
    const totalReviews = reviews.length;

    mobileReviewsCount.textContent =
      `${totalReviews} ${totalReviews === 1 ? "review" : "reviews"}`;


    // Average rating
    if (totalReviews > 0) {

      const totalRating = reviews.reduce(
        (sum, review) => sum + Number(review.rating),
        0
      );

      const averageRating = totalRating / totalReviews;

      mobileReviewsAverage.textContent =
        averageRating.toFixed(1);

      const roundedRating = Math.round(averageRating);

      mobileReviewsAverageStars.textContent =
        "★".repeat(roundedRating) +
        "☆".repeat(5 - roundedRating);

    } else {

      mobileReviewsAverage.textContent = "0.0";
      mobileReviewsAverageStars.textContent = "☆☆☆☆☆";

    }


    // Display all reviews
    reviews.forEach((review) => {

      const card = document.createElement("article");

      card.className =
        "mobile-customer-review-card";

      card.innerHTML = `
        <h3 class="mobile-customer-review-card__name">
          ${review.name}
        </h3>

        <div
          class="mobile-customer-review-card__rating"
          aria-label="${review.rating} out of 5 stars"
        >
          ${"★".repeat(Number(review.rating))}
        </div>

        <p class="mobile-customer-review-card__text">
          ${review.review}
        </p>
      `;

      mobileReviewsList.appendChild(card);

    });

  } catch (error) {

    console.error(
      "Couldn't load mobile customer reviews:",
      error
    );

  }
}