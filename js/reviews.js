import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";


// ============================================================
// DESKTOP CUSTOMER REVIEWS
// ============================================================

const reviewList = document.getElementById(
  "customer-reviews-list"
);


// ============================================================
// DESKTOP TOP 3 REVIEW IDs
// ============================================================

const TOP_REVIEW_IDS = [
  "04KZmPw3igXaWfLfXKrM",
  "1gjnCwulopAGOLFhgWLB",
  "AwcdZUovKE0JpJHn1rZH"
];


// ============================================================
// LOAD DESKTOP TOP 3 REVIEWS
// ============================================================

async function loadCustomerReviews() {

  if (!reviewList) {
    return;
  }

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

      if (
        !review.name ||
        !review.review ||
        !review.rating
      ) {
        continue;
      }

      const card = document.createElement("article");

      card.className = "ck-review-card";

      card.innerHTML = `
        <div>

          <div
            class="ck-review-card__rating"
            aria-label="${review.rating} out of 5 stars"
          >
            ${"★".repeat(Number(review.rating))}
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
        `Couldn't load desktop review ${reviewId}:`,
        error
      );

    }
  }
}


// Load desktop reviews
loadCustomerReviews();


// ============================================================
// MOBILE CUSTOMER REVIEWS
// ============================================================

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


// ============================================================
// MOBILE CUSTOMER REVIEWS MENU LINKS
// ============================================================

const customerReviewsLinks = document.querySelectorAll(
  'a[href="#customer-reviews"]'
);


// ============================================================
// OPEN MOBILE CUSTOMER REVIEWS
// ============================================================

customerReviewsLinks.forEach((link) => {

  link.addEventListener("click", async (event) => {

    // Desktop par normal Customer Reviews section hi rahega
    if (window.innerWidth > 767) {
      return;
    }

    event.preventDefault();

    if (!mobileReviewsModal) {
      return;
    }

    // Open modal
    mobileReviewsModal.hidden = false;

    // Lock background scrolling
    document.body.style.overflow = "hidden";

    // Load reviews
    await loadMobileCustomerReviews();

  });

});


// ============================================================
// CLOSE MOBILE CUSTOMER REVIEWS
// ============================================================

mobileReviewsClose?.addEventListener("click", () => {

  if (!mobileReviewsModal) {
    return;
  }

  mobileReviewsModal.hidden = true;

  // Restore background scrolling
  document.body.style.overflow = "";

});


// ============================================================
// LOAD ALL APPROVED MOBILE REVIEWS
// ============================================================

async function loadMobileCustomerReviews() {

  if (!mobileReviewsList) {
    return;
  }

  // Clear old reviews
  mobileReviewsList.innerHTML = "";


  try {

    // Get all approved reviews
    const reviewsSnapshot = await getDocs(
      collection(db, "publicReviews")
    );


    // --------------------------------------------------------
    // STORE REVIEWS
    // --------------------------------------------------------

    const reviews = [];


    // --------------------------------------------------------
    // RATING COUNTS
    // --------------------------------------------------------

    const ratingCounts = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };


    // --------------------------------------------------------
    // READ FIRESTORE REVIEWS
    // --------------------------------------------------------

    reviewsSnapshot.forEach((docSnap) => {

      const review = docSnap.data();

      const rating = Number(review.rating);


      if (
        review.name &&
        review.review &&
        rating >= 1 &&
        rating <= 5
      ) {

        reviews.push({
          name: review.name,
          review: review.review,
          rating: rating
        });


        // Increase rating count
        ratingCounts[rating]++;

      }

    });


    // ========================================================
    // TOTAL REVIEW COUNT
    // ========================================================

    const totalReviews = reviews.length;


    if (mobileReviewsCount) {

      mobileReviewsCount.textContent =
        `Based on ${totalReviews} ${
          totalReviews === 1
            ? "review"
            : "reviews"
        }`;

    }


    // ========================================================
    // AVERAGE RATING
    // ========================================================

    if (totalReviews > 0) {

      const totalRating = reviews.reduce(
        (sum, review) => {
          return sum + review.rating;
        },
        0
      );


      const averageRating =
        totalRating / totalReviews;


      // Example: 4.5
      if (mobileReviewsAverage) {

        mobileReviewsAverage.textContent =
          averageRating.toFixed(1);

      }


      // Average stars
      const roundedRating =
        Math.round(averageRating);


      if (mobileReviewsAverageStars) {

        mobileReviewsAverageStars.textContent =
          "★".repeat(roundedRating) +
          "☆".repeat(5 - roundedRating);

      }

    } else {

      if (mobileReviewsAverage) {
        mobileReviewsAverage.textContent = "0.0";
      }

      if (mobileReviewsAverageStars) {
        mobileReviewsAverageStars.textContent =
          "☆☆☆☆☆";
      }

    }


    // ========================================================
    // RATING DISTRIBUTION
    // ========================================================

    const maxRatingCount = Math.max(
      ...Object.values(ratingCounts),
      1
    );


    for (let rating = 5; rating >= 1; rating--) {

      const count =
        ratingCounts[rating];


      // Bar width is relative to highest rating count
      const percentage =
        (count / maxRatingCount) * 100;


      const bar = document.querySelector(
        `[data-rating-bar="${rating}"]`
      );


      const countElement =
        document.querySelector(
          `[data-rating-count="${rating}"]`
        );


      if (bar) {

        bar.style.width =
          `${percentage}%`;

      }


      if (countElement) {

        countElement.textContent =
          count;

      }

    }


    // ========================================================
    // DISPLAY ALL REVIEWS
    // ========================================================

    reviews.forEach((review) => {

      const card =
        document.createElement("article");


      card.className =
        "mobile-customer-review-card";


      card.innerHTML = `
        <h3
          class="mobile-customer-review-card__name"
        >
          ${review.name}
        </h3>

        <div
          class="mobile-customer-review-card__rating"
          aria-label="${review.rating} out of 5 stars"
        >
          ${"★".repeat(review.rating)}
        </div>

        <p
          class="mobile-customer-review-card__text"
        >
          ${review.review}
        </p>
      `;


      mobileReviewsList.appendChild(card);

    });


    // ========================================================
    // DEBUG
    // ========================================================

    console.log(
      "Mobile reviews loaded:",
      totalReviews
    );

    console.log(
      "Rating counts:",
      ratingCounts
    );


  } catch (error) {

    console.error(
      "Couldn't load mobile customer reviews:",
      error
    );

    console.error(
      "Firebase error code:",
      error?.code
    );

    console.error(
      "Firebase error message:",
      error?.message
    );

  }

}