# Aangan Kitchen — Cloud Kitchen Website

A premium, single-page website for a home-style Indian cloud kitchen, with
a date-based daily menu managed from a no-code admin panel backed by
Firebase. Built with plain HTML/CSS/JS — no framework, no build step —
so it deploys to Netlify as a static site.

This is a **completely separate project** from any other app you run
(e.g. "dispatch-news"). It uses its own GitHub repo, its own Firebase
project, its own Firestore database, its own Firebase Authentication,
and its own Netlify site. Nothing here reads from or writes to another
project's Firebase config.

## What's in here

```
cloud-kitchen/
├── index.html          Public website
├── admin.html           Admin dashboard (menu + festival management)
├── login.html            Admin login
├── css/
│   ├── style.css         Core design system
│   ├── responsive.css     Mobile/tablet breakpoints
│   └── admin.css          Admin panel styles
├── js/
│   ├── firebase.js        Firebase init — put your project config here
│   ├── config.js           Brand/contact copy + static food catalog
│   ├── app.js               Public site logic (nav, catalog, menu load)
│   ├── menu.js                Daily menu read/write helpers
│   ├── festival.js             Festival detection + theming
│   ├── auth.js                  Admin login/logout helpers
│   ├── auth-page.js               Wires login.html's form
│   └── admin.js                    Admin dashboard logic
├── assets/
│   ├── images/            Static food photos (currently SVG placeholders)
│   └── icons/               Logo mark + favicon
├── scripts/
│   ├── seed.js              One-time sample-data loader (Node, admin SDK)
│   ├── seed-data.json         The sample data itself
│   └── package.json
├── firestore.rules       Security rules — deploy these to Firebase
├── netlify.toml            Netlify build/publish config
└── README.md (this file)
```

## 1. Create the Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com) →
   **Add project** → name it `cloud-kitchen` (or similar). Do **not**
   reuse an existing project.
2. Once created, go to **Project settings → General → Your apps → Add
   app → Web (`</>`)**. Register an app (nickname anything, e.g. "Aangan
   Web"). You don't need Firebase Hosting.
3. Copy the `firebaseConfig` object shown — you'll paste it into
   `js/firebase.js` in step 5.

## 2. Enable Firebase Authentication

1. In the Firebase Console, go to **Build → Authentication → Get
   started**.
2. Under **Sign-in method**, enable **Email/Password**.
3. Go to the **Users** tab → **Add user** → enter the email/password
   you (the kitchen owner) will use to log into the admin panel.
4. Click the new user and copy their **User UID** — you'll need it for
   the security rules in step 4.

## 3. Create Firestore

1. Go to **Build → Firestore Database → Create database**.
2. Choose **Production mode** (the rules in this repo lock it down
   properly — never leave it in permissive test mode long-term).
3. Pick a location close to your users (e.g. `asia-south1` for India).

Firestore will use these top-level collections (created automatically
the first time you write to them — no manual setup needed):

- `dailyMenus/{YYYY-MM-DD}` — one document per date
- `festivals/{festivalId}` — festival configuration
- `siteConfig/{docId}` — optional general site config

## 4. Configure Firestore Security Rules

1. Open `firestore.rules` in this repo.
2. Replace `"REPLACE_WITH_ADMIN_UID"` with the UID you copied in step 2
   (add more UIDs to the array if you have more than one admin).
3. In the Firebase Console, go to **Firestore Database → Rules**, paste
   the contents of `firestore.rules`, and click **Publish**.

These rules let anyone **read** menu/festival/config data (so the
public website works) but only your authorized admin UID(s) can
**write** anything. There is no `allow write: if true` anywhere.

## 5. Add your Firebase config to the site

Open `js/firebase.js` and replace the placeholder `firebaseConfig`
object with the one you copied in step 1:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "cloud-kitchen-xxxxx.firebaseapp.com",
  projectId: "cloud-kitchen-xxxxx",
  storageBucket: "cloud-kitchen-xxxxx.appspot.com",
  messagingSenderId: "...",
  appId: "...",
};
```

This is safe to have client-side — it identifies your project, it
doesn't authorize access. Actual protection is the rules from step 4.

## 6. Run locally

This is a static site with ES modules, so it needs to be served over
HTTP (not opened as a `file://` URL). Any static server works, e.g.:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## 7. Load sample data (optional but recommended)

So the site doesn't look empty on first launch:

```bash
cd scripts
npm install
```

Then, in Firebase Console → **Project settings → Service accounts** →
**Generate new private key**, save the downloaded file as
`scripts/service-account.json` (already git-ignored — never commit
this file). Then:

```bash
node seed.js
```

This loads 14 days of sample daily menus, 3 sample festivals, and a
sample site-config document into Firestore.

## 8. Create the GitHub repository

```bash
git init
git add .
git commit -m "Initial commit: Aangan Kitchen"
git branch -M main
git remote add origin https://github.com/<your-username>/cloud-kitchen.git
git push -u origin main
```

Use a repo named `cloud-kitchen` (or similar) — a **separate**
repository from any other project you maintain.

## 9. Connect GitHub to Netlify

1. In [Netlify](https://app.netlify.com), click **Add new site → Import
   an existing project**.
2. Connect your GitHub account and select the `cloud-kitchen` repo.
3. Build settings: leave the build command empty and set the publish
   directory to `.` (this repo has no build step — `netlify.toml`
   already sets this for you).
4. Click **Deploy**. Netlify gives you a `*.netlify.app` URL.

## 10. How automatic deployment works

```
You push code → GitHub → Netlify detects the push → builds → deploys
```

Every `git push` to `main` triggers a new deploy automatically. This
only applies to **code** changes (HTML/CSS/JS). Daily menu changes
never need a push — see below.

## 11. Using the Admin Panel

1. Go to `https://<your-site>.netlify.app/login.html`.
2. Sign in with the admin email/password you created in step 2.
3. You'll land on the **Dashboard** tab: today's date, how many items
   are on today's menu, the active festival (if any), and a 7-day
   upcoming-menu overview.

## 12. Adding or updating a daily menu

1. Go to the **Menu Management** tab.
2. Pick a date (defaults to today) and click **Load** (today's menu
   loads automatically).
3. Click **Add Item** for each dish — name, category, description,
   optional image URL, optional price, and an **Available** checkbox
   for marking something sold out without deleting it.
4. Use the ↑ / ↓ buttons to reorder items, or ✕ to remove one.
5. Add an optional **special note** (e.g. "Freshly prepared today").
6. Click **Save Menu**. The public website reflects this immediately —
   no code changes, no git push, no Netlify deploy.

**Duplicate Previous Menu**: load the date you want to copy *from* in
the date field, enter the target date in **Duplicate to**, then click
**Duplicate Previous Menu**. Load the target date afterward to tweak
it before saving further changes.

## 13. Using ImgBB image URLs for daily menu items

Static Kitchen Favorites images live in `assets/images/` and ship with
the code (see step 14). Daily menu item photos work differently, since
they change constantly and shouldn't require a deploy:

1. Upload your photo at [imgbb.com](https://imgbb.com) (no account
   required for a one-off upload, though an account keeps images from
   expiring).
2. Copy the **direct image link** (ends in `.jpg`/`.png`, not the
   ImgBB page URL).
3. Paste it into the **Image URL** field for that menu item in the
   admin panel and save.

No ImgBB API key is ever placed in this codebase — pasting a URL
avoids needing one.

## 14. Updating the permanent food catalog / static images

The "Kitchen Favorites" catalog (`js/config.js` → `STATIC_CATALOG`) is
part of the source code, not Firestore, since it rarely changes. To
swap in real photography:

1. Add your `.jpg`/`.webp` files to `assets/images/`, using the same
   filenames referenced in `STATIC_CATALOG` (e.g. replace
   `dal.svg` with `dal.jpg` and update the `image` path in
   `config.js`).
2. Commit and push — this is a code change, so it goes through GitHub
   → Netlify like any other.

## 15. Updating festival dates every year

Two ways:

- **Admin panel (recommended)**: go to the **Festivals** tab, edit the
  start/end dates and greeting for each festival, and click **Save**.
  Takes effect immediately, no deploy.
- **Code fallback**: `js/festival.js` has a `FALLBACK_FESTIVALS` array
  used only if Firestore is unreachable. Update it once a year to keep
  it in sync, or ignore it if you're comfortable relying on Firestore
  being available.

To support a new festival, add a row in the admin panel with a `theme`
key. If you want a specific visual treatment (not just the default
warm-glow accent), add a matching entry to `THEME_TREATMENTS` in
`js/festival.js`.

## Notes on scope

- This build focuses on the ordering *conversation* (call/WhatsApp),
  not an in-browser cart/checkout/payment flow — the brief's Contact /
  Order section is built around that. If you want in-site ordering and
  payments later, that's a distinct, larger feature (likely its own
  Firestore collections and possibly a payment gateway) — happy to
  scope it separately.
- `assets/images/*.svg` are placeholder illustrations in the brand
  palette, clearly named so you can drop in real photography without
  touching any code beyond the file swap described in step 14.
