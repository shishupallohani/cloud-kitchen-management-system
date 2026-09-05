/**
 * scripts/seed.js
 * -----------------------------------------------------------------------
 * One-time helper to load sample data (seed-data.json) into your
 * "cloud-kitchen" Firestore project, so the site doesn't look empty on
 * first launch. Uses firebase-admin, so it needs a service account key —
 * this never runs in the browser and never ships to Netlify.
 *
 * Setup:
 *   1. npm install firebase-admin
 *   2. Firebase Console → Project Settings → Service Accounts →
 *      "Generate new private key" → save as scripts/service-account.json
 *      (this file is gitignored — never commit it)
 *   3. node scripts/seed.js
 * -----------------------------------------------------------------------
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const keyPath = path.join(__dirname, "service-account.json");

if (!fs.existsSync(keyPath)) {
  console.error(
    "Missing scripts/service-account.json.\n" +
      "Download it from Firebase Console → Project Settings → Service Accounts, " +
      "and save it at that path before running this script."
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(keyPath)),
});

const db = require("firebase-admin/firestore").getFirestore(
  admin.app(),
  "default"
);

async function seed() {
  const data = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "seed-data.json"),
      "utf8"
    )
  );

  const batches = [];

  for (const [dateKey, menu] of Object.entries(data.dailyMenus)) {
    batches.push(
      db.collection("dailyMenus").doc(dateKey).set(menu)
    );
  }

  for (const [docId, config] of Object.entries(data.siteConfig)) {
    batches.push(
      db.collection("siteConfig").doc(docId).set(config)
    );
  }

  await Promise.all(batches);

  console.log(
    `Seeded ${Object.keys(data.dailyMenus).length} daily menus and site config.`
  );
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });