/**
 * theme-sync.js
 * -----------------------------------------------------------------------
 * Keeps the customer ordering UI in sync with the main Charroti Kitchen
 * website theme.
 *
 * Source of truth:
 *   Firestore -> siteConfig/theme -> activeTheme
 *
 * The same theme presets used by the website are reused here.
 * No second theme list is maintained inside the ordering app.
 * -----------------------------------------------------------------------
 */

import {
  THEME_PRESETS,
  DEFAULT_THEME_KEY,
} from "../../js/site-theme.js";

import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";


const THEME_DOC = doc(db, "siteConfig", "theme");

const LOCAL_THEME_KEY = "ck-site-theme";
const LOCAL_THEME_VARS_KEY = "ck-site-theme-vars";


/* -----------------------------------------------------------------------
   Small colour helpers
   ----------------------------------------------------------------------- */

function hexToRgb(hex) {
  const value = String(hex || "").replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return null;
  }

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}


function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((value) =>
      Math.round(value)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;
}


function mixColors(first, second, firstWeight = 0.5) {
  const a = hexToRgb(first);
  const b = hexToRgb(second);

  if (!a || !b) {
    return first || second || "#ffffff";
  }

  const weight = Math.max(0, Math.min(1, firstWeight));

  return rgbToHex({
    r: a.r * weight + b.r * (1 - weight),
    g: a.g * weight + b.g * (1 - weight),
    b: a.b * weight + b.b * (1 - weight),
  });
}


function darken(hex, amount = 0.15) {
  const rgb = hexToRgb(hex);

  if (!rgb) {
    return hex;
  }

  const factor = Math.max(0, 1 - amount);

  return rgbToHex({
    r: rgb.r * factor,
    g: rgb.g * factor,
    b: rgb.b * factor,
  });
}


/*
 * Picks a readable label colour (white or near-black) for text that
 * sits on top of a --color-primary background (active filter pills,
 * solid buttons, etc).
 *
 * This is what makes the fix work for EVERY admin theme: instead of
 * hard-coding white text and hoping the theme colour is always dark
 * enough, we measure the actual brightness of the colour the pill will
 * be painted with and flip the text between white and dark ink so it
 * always stays legible - light gold themes get dark text, deep/maroon
 * themes get white text.
 */
function getReadableTextOn(hex) {
  const rgb = hexToRgb(hex);

  if (!rgb) {
    return { color: "#ffffff", shadow: "0 1px 2px rgba(0, 0, 0, 0.45)" };
  }

  // Perceived brightness (YIQ), 0 (dark) - 255 (light).
  const brightness =
    (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;

  const isLight = brightness > 150;

  return isLight
    ? {
        color: "#1a1408",
        shadow: "0 1px 1px rgba(255, 255, 255, 0.35)",
      }
    : {
        color: "#ffffff",
        shadow: "0 1px 2px rgba(0, 0, 0, 0.45)",
      };
}


/* -----------------------------------------------------------------------
   Cached theme
   ----------------------------------------------------------------------- */

function getCachedTheme() {
  try {
    const key = localStorage.getItem(LOCAL_THEME_KEY);

    if (key && THEME_PRESETS[key]) {
      return {
        key,
        preset: THEME_PRESETS[key],
      };
    }

    const rawVars = localStorage.getItem(LOCAL_THEME_VARS_KEY);

    if (rawVars) {
      const vars = JSON.parse(rawVars);

      if (
        vars["--bg-light"] &&
        vars["--gold"]
      ) {
        return {
          key: key || DEFAULT_THEME_KEY,
          vars,
        };
      }
    }
  } catch (error) {
    // localStorage is optional.
  }

  return null;
}


/* -----------------------------------------------------------------------
   Apply website theme to Order UI variables
   ----------------------------------------------------------------------- */

function applyOrderTheme(theme) {
  const root = document.documentElement;

  const preset = theme?.preset;
  const vars = theme?.vars;

  const bg =
    vars?.["--bg"] ||
    preset?.bg;

  const bgLight =
    vars?.["--bg-light"] ||
    preset?.bgLight;

  const bgLightRaised =
    vars?.["--bg-light-raised"] ||
    preset?.bgLightRaised;

  const inkOnLight =
    vars?.["--ink-on-light"] ||
    preset?.inkOnLight;

  const inkOnLightDim =
    vars?.["--ink-on-light-dim"] ||
    preset?.inkOnLightDim;

  const gold =
    vars?.["--gold"] ||
    preset?.gold;

  const goldSoft =
    vars?.["--gold-soft"] ||
    preset?.goldSoft;

  const maroon =
    vars?.["--maroon"] ||
    preset?.maroon;

  const sage =
    vars?.["--sage"] ||
    preset?.sage;

  const borderLight =
    vars?.["--border-light"] ||
    preset?.borderLight;


  if (!bg || !bgLight || !inkOnLight || !gold) {
    return;
  }


  /*
   * Keep cards/forms light and readable while still following
   * the active website theme.
   */
  const surface = bgLightRaised
    ? mixColors("#ffffff", bgLightRaised, 0.82)
    : mixColors("#ffffff", bgLight, 0.82);


  const primaryLight = mixColors(
    gold,
    bgLight,
    0.14
  );


  /* Primary theme colours */

  root.style.setProperty(
    "--color-primary",
    gold
  );

  const primaryDark = darken(gold, 0.16);

  root.style.setProperty(
    "--color-primary-dark",
    primaryDark
  );

  root.style.setProperty(
    "--color-primary-light",
    primaryLight
  );


  /*
   * Readable label colour for anything painted with --color-primary /
   * --color-primary-dark (e.g. the active "Explore Menu" category
   * pill). Computed from the actual pill colours so it adapts to any
   * theme instead of assuming white always shows up.
   */
  const onPrimary = getReadableTextOn(
    mixColors(gold, primaryDark, 0.5)
  );

  root.style.setProperty(
    "--color-on-primary",
    onPrimary.color
  );

  root.style.setProperty(
    "--text-shadow-on-primary",
    onPrimary.shadow
  );


  /*
   * Website dark theme colour becomes the
   * strong secondary colour in Order UI.
   */
  root.style.setProperty(
    "--color-secondary",
    bg
  );


  /* Text */

  root.style.setProperty(
    "--color-text",
    inkOnLight
  );

  root.style.setProperty(
    "--color-text-muted",
    inkOnLightDim || inkOnLight
  );


  /* Background / surfaces */

  root.style.setProperty(
    "--color-bg",
    bgLight
  );

  root.style.setProperty(
    "--color-surface",
    surface
  );

  root.style.setProperty(
    "--color-border",
    borderLight || "rgba(0,0,0,0.14)"
  );


  /* Semantic colours */

  root.style.setProperty(
    "--color-success",
    sage || gold
  );

  root.style.setProperty(
    "--color-success-bg",
    mixColors(
      sage || gold,
      bgLight,
      0.12
    )
  );


  root.style.setProperty(
    "--color-error",
    maroon || gold
  );

  root.style.setProperty(
    "--color-error-bg",
    mixColors(
      maroon || gold,
      bgLight,
      0.10
    )
  );


  root.style.setProperty(
    "--color-warning",
    goldSoft || gold
  );

  root.style.setProperty(
    "--color-warning-bg",
    mixColors(
      goldSoft || gold,
      bgLight,
      0.10
    )
  );


  if (theme.key) {
    root.setAttribute(
      "data-order-theme",
      theme.key
    );
  }
}


/* -----------------------------------------------------------------------
   Cache selected theme for instant loading next time
   ----------------------------------------------------------------------- */

function cacheThemeKey(themeKey) {
  const preset = THEME_PRESETS[themeKey];

  if (!preset) {
    return;
  }

  try {
    localStorage.setItem(
      LOCAL_THEME_KEY,
      themeKey
    );

    localStorage.setItem(
      LOCAL_THEME_VARS_KEY,
      JSON.stringify({
        "--bg": preset.bg,
        "--bg-raised": preset.bgRaised,
        "--bg-light": preset.bgLight,
        "--bg-light-raised": preset.bgLightRaised,
        "--ink": preset.ink,
        "--ink-dim": preset.inkDim,
        "--ink-on-light": preset.inkOnLight,
        "--ink-on-light-dim": preset.inkOnLightDim,
        "--gold": preset.gold,
        "--gold-soft": preset.goldSoft,
        "--maroon": preset.maroon,
        "--sage": preset.sage,
        "--border-dark": preset.borderDark,
        "--border-dark-strong": preset.borderDarkStrong,
        "--border-light": preset.borderLight,
      })
    );
  } catch (error) {
    // localStorage is optional.
  }
}


/* -----------------------------------------------------------------------
   Apply a theme key
   ----------------------------------------------------------------------- */

function applyThemeKey(themeKey) {
  if (
    !themeKey ||
    !THEME_PRESETS[themeKey]
  ) {
    return;
  }

  applyOrderTheme({
    key: themeKey,
    preset: THEME_PRESETS[themeKey],
  });

  cacheThemeKey(themeKey);
}


/* -----------------------------------------------------------------------
   Apply cached theme immediately
   ----------------------------------------------------------------------- */

const cachedTheme = getCachedTheme();

if (cachedTheme) {
  applyOrderTheme(cachedTheme);
}


/* -----------------------------------------------------------------------
   Read current theme from Firestore
   ----------------------------------------------------------------------- */

getDoc(THEME_DOC)
  .then((snapshot) => {

    if (!snapshot.exists()) {

      if (!cachedTheme) {
        applyThemeKey(DEFAULT_THEME_KEY);
      }

      return;
    }


    const themeKey =
      snapshot.data()?.activeTheme;


    if (
      themeKey &&
      THEME_PRESETS[themeKey]
    ) {

      applyThemeKey(themeKey);

    } else if (!cachedTheme) {

      applyThemeKey(DEFAULT_THEME_KEY);
    }
  })
  .catch((error) => {

    /*
     * If Firestore is temporarily unavailable,
     * keep the already cached theme.
     */
    if (!cachedTheme) {
      applyThemeKey(DEFAULT_THEME_KEY);
    }

    console.warn(
      "Order UI theme lookup failed:",
      error
    );
  });


/* -----------------------------------------------------------------------
   Real-time theme synchronization
   ----------------------------------------------------------------------- */

onSnapshot(
  THEME_DOC,

  (snapshot) => {

    if (!snapshot.exists()) {
      return;
    }

    const themeKey =
      snapshot.data()?.activeTheme;


    if (
      themeKey &&
      THEME_PRESETS[themeKey]
    ) {
      applyThemeKey(themeKey);
    }
  },

  (error) => {

    console.warn(
      "Order UI theme listener failed:",
      error
    );
  }
);