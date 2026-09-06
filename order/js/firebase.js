/**
 * firebase.js
 *
 * Ordering app uses the SAME Firebase project and SAME Firebase
 * application instance as the main Charroti website.
 *
 * Do not initialize Firebase again here.
 */

import {
  app,
  auth,
  db,
} from "../../js/firebase.js";

export { app, auth, db };

export default app;