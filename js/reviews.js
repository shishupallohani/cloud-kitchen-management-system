import { db } from "./firebase.js";

import {
  doc,
  getDoc
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