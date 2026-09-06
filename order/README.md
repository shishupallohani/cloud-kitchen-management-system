# Charroti Kitchen — Customer Ordering App

A standalone, modular customer ordering web application for the Charroti
Kitchen cloud kitchen. Built with plain HTML5, CSS3, and vanilla
JavaScript (ES modules) on top of Firebase Authentication and Firebase
Firestore — no frameworks, no build step.

This app is designed to sit **behind an "ORDER NOW" button on the existing
Charroti Kitchen marketing website**. It does not recreate that website —
it only handles registration, login, browsing, cart, checkout, and order
tracking.

---

## 1. Project Overview

| Capability | Where it lives |
|---|---|
| Registration / Login / Logout / Forgot Password | Firebase Authentication (`js/auth.js`) |
| Customer profile | Firestore `users/{uid}` (`js/user-service.js`, `js/profile-service.js`) |
| Menu browsing | `js/menu-service.js` (local mock data today, Firestore-ready) |
| Favorites | Firestore `users/{uid}/favorites/{dishId}` (`js/favorites-service.js`) |
| Cart | Firestore `users/{uid}/cart/{dishId}` (`js/cart-service.js`) |
| Checkout & payment method | `js/payment-service.js` (COD + UPI QR, extensible) |
| Orders & status tracking | Firestore `orders/{orderId}` (`js/order-service.js`) |

Every Firebase call is isolated inside a `js/*-service.js` file. Pages
(`js/pages/*.js`) never talk to Firebase directly — they only call these
services. This is what makes the app safe to integrate into another
codebase later without a rewrite.

---

## 2. Folder Structure

```
/
├── index.html            # Auth-based redirect gate (entry point from "ORDER NOW")
├── login.html
├── register.html
├── forgot-password.html
├── dashboard.html
├── menu.html
├── favorites.html
├── cart.html
├── checkout.html
├── orders.html
├── order-details.html
├── profile.html
│
├── css/
│   ├── order-base.css     # Design tokens, reset, buttons, cards, nav, toasts
│   ├── auth.css           # Login / register / forgot-password / profile card
│   ├── dashboard.css
│   ├── menu.css           # Menu grid + favorites list
│   ├── cart.css
│   ├── checkout.css
│   ├── orders.css         # Order history + order details + status tracker
│   └── responsive.css     # Mobile-first breakpoints (loaded last)
│
├── js/
│   ├── config.js            # ALL configurable values (see §7)
│   ├── firebase.js          # Firebase init — put your real config here
│   ├── auth.js               # Register / login / logout / reset password
│   ├── auth-guard.js         # Route protection (requireAuth / redirectIfAuthenticated)
│   ├── user-service.js       # Firestore CRUD for users/{uid}
│   ├── profile-service.js    # Profile-page validation + save logic
│   ├── menu-service.js       # Menu data layer (local mock ⇄ Firestore)
│   ├── favorites-service.js
│   ├── cart-service.js
│   ├── order-service.js      # Order creation (freezes prices) + history
│   ├── payment-service.js    # COD / UPI strategy objects
│   ├── ui.js                  # Toasts, loading/empty/error states, formatting
│   ├── nav.js                  # Shared top navigation component
│   └── pages/                  # One controller script per HTML page
│       ├── login.js
│       ├── register.js
│       ├── forgot-password.js
│       ├── dashboard.js
│       ├── menu.js
│       ├── favorites.js
│       ├── cart.js
│       ├── checkout.js
│       ├── orders.js
│       ├── order-details.js
│       └── profile.js
│
├── assets/
│   ├── images/
│   │   └── upi-qr.png       # Placeholder QR — replace with your real one (§8)
│   └── icons/
│
├── firestore.rules
└── README.md
```

---

## 3. Firebase Setup

1. Go to the [Firebase Console](https://console.firebase.google.com) and
   create a project (or use an existing one).
2. Add a **Web app** to the project (Project Settings → General → "Your
   apps" → `</>` icon). Copy the generated config object.
3. Paste those values into `js/firebase.js`, replacing the placeholders:

   ```js
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID",
   };
   ```

**Never commit real Firebase keys to a public repository if the project
has restrictive Firestore rules relying on secrecy** — Firebase web
config is not a secret by design (it's visible in any browser's network
tab), but access is enforced entirely by Firestore Security Rules
(`firestore.rules`), so make sure those are deployed correctly (§5).

---

## 4. Authentication Setup

1. In the Firebase Console, go to **Build → Authentication → Sign-in
   method**.
2. Enable the **Email/Password** provider.
3. That's it — `js/auth.js` handles registration, login, logout, and
   password-reset emails entirely through the Firebase Authentication
   SDK. No custom password storage exists anywhere in this app.

---

## 5. Firestore Setup & Rules Deployment

1. In the Firebase Console, go to **Build → Firestore Database** and
   create a database (start in production mode).
2. Deploy `firestore.rules` using the Firebase CLI:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init firestore     # point it at your existing project
   # when asked for the rules file, point it at ./firestore.rules
   firebase deploy --only firestore:rules
   ```

   Or paste the contents of `firestore.rules` directly into the Firebase
   Console under **Firestore Database → Rules** and click "Publish".

3. **Composite index note:** `getOrdersByUser()` in `order-service.js`
   queries `orders` with `where("userId", "==", uid)` combined with
   `orderBy("createdAt", "desc")`. Firestore requires a composite index
   for this. The first time you run the app and view "My Orders", the
   browser console will show an error containing a direct link to
   auto-create this index in the Firebase Console — click it once and
   the query will work from then on.

### Firestore structure created by this app

```
users/{uid}
  { name, email, mobile, address, landmark, city, createdAt, updatedAt }

users/{uid}/favorites/{dishId}
  { dishId, name, price, image, category, addedAt }

users/{uid}/cart/{dishId}
  { dishId, name, price, image, quantity }

orders/{orderId}
  {
    orderId, userId, customerName, email, mobile, address, landmark, city,
    items: [{ dishId, name, price, quantity }],
    subtotal, deliveryCharge, totalAmount,
    paymentMethod, paymentStatus,
    orderStatus,
    createdAt, updatedAt
  }
```

### Seeding the menu (optional, for the Firestore menu source)

The app ships with `menuSource: "local"` in `js/config.js`, which uses a
bundled mock menu — no Firestore menu setup needed to test the full
ordering flow today. When the real Charroti Kitchen menu is ready in
Firestore, create a `menu` collection with documents shaped like:

```json
{
  "name": "Paneer Thali",
  "description": "Paneer curry, dal, rice, 2 roti, salad, and pickle.",
  "price": 149,
  "image": "https://your-cdn.com/paneer-thali.jpg",
  "category": "Thali",
  "available": true
}
```

Then flip one line in `js/config.js`:

```js
menuSource: "firestore",
```

No other file needs to change — every page reads the menu exclusively
through `menu-service.js`.

---

## 6. How to Run Locally

This is a static site with ES modules, so it must be served over HTTP
(not opened as a `file://` URL, which browsers block for module imports
and for Firebase Auth redirects).

**Option A — Python (built into most systems):**
```bash
cd charroti-kitchen-ordering
python3 -m http.server 8080
```
Then open `http://localhost:8080/index.html`.

**Option B — Node's `serve` package:**
```bash
npx serve .
```

**Option C — VS Code "Live Server" extension:** right-click
`index.html` → "Open with Live Server".

You'll also need to add `localhost` (and later your production domain)
to **Firebase Console → Authentication → Settings → Authorized domains**.

---

## 7. Configurable Settings (`js/config.js`)

Everything likely to change without a code change lives in one object:

| Setting | Purpose |
|---|---|
| `kitchenName` | Shown in the nav brand, browser tabs |
| `currencySymbol` | Used by every price formatter |
| `deliveryCharge` | Flat delivery fee applied to every order |
| `freeDeliveryThreshold` | Subtotal at/above which delivery is free (`0` disables) |
| `orderIdPrefix` | Prefix for generated order IDs (e.g. `CR7F3K9Q2`) |
| `upi.upiId` / `upi.payeeName` | Used in the UPI payment panel |
| `upi.qrImagePath` | Path to the QR image shown at checkout |
| `menuSource` | `"local"` or `"firestore"` — see §5 |
| `collections` | Firestore collection/subcollection names |

### How to change the delivery charge

Edit `js/config.js`:
```js
deliveryCharge: 30,           // ← change this number
freeDeliveryThreshold: 499,   // ← or this one (0 disables free delivery)
```
No other file needs to change — `cart-service.js`'s
`calculateDeliveryCharge()` is the single place this value is read.

---

## 8. How to Change the UPI QR Code

Two things need to line up in `js/config.js`:

```js
upi: {
  upiId: "charrotikitchen@upi",     // ← your real UPI VPA
  payeeName: "Charroti Kitchen",
  qrImagePath: "assets/images/upi-qr.png",
},
```

1. Generate a QR code image that encodes your UPI payment string (any
   UPI QR generator, or your bank/payment app's "My QR Code" export
   works). Save it as `assets/images/upi-qr.png` (or update
   `qrImagePath` to point wherever you place it).
2. Update `upiId` and `payeeName` to match what's encoded in that QR, so
   the text shown under the QR on the checkout page stays accurate.
3. `payment-service.js` also exposes `UPIPayment.buildUpiUri(amount,
   orderRef)`, which builds a standard `upi://pay?...` deep link from
   these same config values — useful if you later want a "Pay with UPI
   app" button in addition to the QR image.

The bundled `assets/images/upi-qr.png` is a **placeholder graphic**
labeled "REPLACE THIS QR" — replace it before going live.

---

## 9. Architecture Notes

- **Services own Firebase.** Every Firestore/Auth call lives in exactly
  one `js/*-service.js` file. Page controllers (`js/pages/*.js`) only
  import and call these functions — they never import the Firebase SDK
  directly. This means Firebase can later be swapped for the host
  website's own Firebase app instance by editing only `js/firebase.js`.

- **Prices are frozen at order time.** `order-service.js` copies
  `dishId`, `name`, `price`, and `quantity` onto the order document at
  creation. Order history and order details always read these frozen
  values — never the live menu price — so a price change next month
  never rewrites what a past order shows.

- **Payment is a strategy, not an if/else.** `payment-service.js`
  exposes a small `{ key, label, getInitialPaymentStatus(), initiate() }`
  interface. `checkout.js` never branches on "if COD else if UPI" — it
  asks the module for the selected strategy object. Adding Razorpay,
  Cashfree, or Stripe later means adding one more object to
  `PAYMENT_STRATEGIES` in that file; no other file changes.

- **Order status & payment status are customer-read-only.**
  `firestore.rules` blocks any client update to an existing order
  document. Status transitions (Pending → Confirmed → Preparing → Ready
  → Delivered, or → Cancelled) are reserved for a future admin panel
  using the Firebase Admin SDK, which bypasses these rules by design.

- **Auth guard pattern.** `auth-guard.js` exposes `requireAuth()` for
  every protected page and `redirectIfAuthenticated()` for the three
  public-only auth pages. Both wait for Firebase's first
  `onAuthStateChanged` callback before deciding, avoiding a flash of the
  wrong screen while the session is still being restored.

- **Menu source is swappable in one line.** See §5 — `menu-service.js`
  is the only file that knows whether menu data comes from the bundled
  mock array or a live Firestore collection.

---

## 10. Integrating Into the Existing Website Later

This app was built assuming it will eventually live alongside an
existing Charroti Kitchen codebase that already has its own Firebase
project, menu data, CSS variables, and (eventually) an admin panel.
When that integration happens:

1. **Firebase app instance:** if the host site already calls
   `initializeApp()` elsewhere, replace the contents of `js/firebase.js`
   with `export { auth, db }` pulled from the host's existing Firebase
   module instead of initializing a second app instance.
2. **Menu data:** flip `menuSource` to `"firestore"` and point
   `APP_CONFIG.collections.menu` at whatever collection name the host's
   menu already uses.
3. **Styling:** `css/order-base.css` defines all colors, spacing, and
   radii as CSS custom properties (`--color-primary`, `--space-4`,
   etc.) at the `:root` level. Overriding these variables from the
   host site's own stylesheet re-themes every page without touching any
   component CSS.
4. **Navigation:** `js/nav.js` renders the shared top nav into a single
   `<div id="app-topnav"></div>` placeholder present on every protected
   page. Swap this one file for a call into the host site's own nav
   component if desired — no page HTML needs to change.
5. **Admin panel:** do not build order-status or payment-status writes
   into this customer app. `firestore.rules` already blocks them from
   the client; a future admin panel should use the Firebase Admin SDK
   (server-side, or a authenticated Cloud Function) to update
   `orderStatus`/`paymentStatus`, and can query `orders` by
   `orderStatus` or `createdAt` (already present on every document) to
   build "New / Pending / Preparing / Ready / Delivered / Cancelled /
   Today's orders / Revenue" views.

---

## 11. What's Intentionally Not Implemented Yet

Per project scope, these were left out on purpose and are documented as
extension points rather than built:

- Razorpay / Cashfree / Stripe or any other payment gateway
- SMS OTP verification
- Delivery-partner assignment / live GPS tracking
- Push notifications
- Coupons / loyalty points
- Admin dashboard
- Complex analytics

---

## 12. Verification Checklist

Before shipping, confirm:

- [ ] Real Firebase config pasted into `js/firebase.js`
- [ ] Email/Password sign-in enabled in Firebase Authentication
- [ ] `firestore.rules` deployed
- [ ] Composite index created for the `orders` query (console will
      prompt with a direct link the first time "My Orders" is opened)
- [ ] Real UPI QR image placed at `assets/images/upi-qr.png` and
      `upiId`/`payeeName` updated in `js/config.js`
- [ ] `localhost` and production domain added under Authentication →
      Authorized domains
- [ ] App served over HTTP(S), not opened as a `file://` path
