/**
 * site-theme.js
 * -----------------------------------------------------------------------
 * Admin-controlled, FULL sitewide colour theme.
 *
 * WHAT THIS FIXES vs the previous version:
 * 1. Every theme's "light section" background is now a clearly-coloured
 *    tone (not a near-white cream) — the About-section-looks-white
 *    complaint is fixed for every theme, not patched for one.
 * 2. The "sometimes correct, sometimes white" flicker was a real bug:
 *    this file fetches the saved theme from Firestore, which takes a
 *    moment. Until that finishes, the page showed the plain default
 *    colours baked into css/style.css's :root (which — being cream —
 *    looked "white"). Fix: the chosen theme is now also cached in
 *    localStorage, and applied INSTANTLY (synchronously, no waiting on
 *    the network) on every load. Firestore is still checked afterwards
 *    in case the theme changed from another device, but the visitor
 *    never sees the default colours flash first.
 *
 * 20 themes are defined below. Every field maps 1:1 to a :root variable
 * in css/style.css. Add a 21st theme by copying one block.
 * -----------------------------------------------------------------------
 */

import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export const THEME_PRESETS = {
  "royal-gold": {
    label: "Royal Gold",
    bg: "#2b2412", bgRaised: "#3d321a",
    bgLight: "#e6dbc1", bgLightRaised: "#dacca9",
    ink: "#f6f4ee", inkDim: "#d2cbbc",
    inkOnLight: "#3b3016", inkOnLightDim: "#736545",
    gold: "#c69c39", goldSoft: "#d3b369", maroon: "#3b889b", sage: "#774076",
    borderDark: "rgba(255,255,255,0.14)", borderDarkStrong: "rgba(255,255,255,0.26)",
    borderLight: "rgba(0,0,0,0.14)",
  },
  "emerald-spice": {
    label: "Emerald Spice",
    bg: "#122b21", bgRaised: "#1a3d2e",
    bgLight: "#c1e6d7", bgLightRaised: "#a9dac6",
    ink: "#eef6f3", inkDim: "#bcd2c9",
    inkOnLight: "#163b2c", inkOnLightDim: "#457360",
    gold: "#39c68b", goldSoft: "#69d3a7", maroon: "#9b3b93", sage: "#777340",
    borderDark: "rgba(255,255,255,0.14)", borderDarkStrong: "rgba(255,255,255,0.26)",
    borderLight: "rgba(0,0,0,0.14)",
  },
  "royal-blue": {
    label: "Royal Blue",
    bg: "#121e2b", bgRaised: "#1a2a3d",
    bgLight: "#c1d2e6", bgLightRaised: "#a9c0da",
    ink: "#eef2f6", inkDim: "#bcc6d2",
    inkOnLight: "#16283b", inkOnLightDim: "#455a73",
    gold: "#397bc6", goldSoft: "#699bd3", maroon: "#9b3e3b", sage: "#487740",
    borderDark: "rgba(255,255,255,0.14)", borderDarkStrong: "rgba(255,255,255,0.26)",
    borderLight: "rgba(0,0,0,0.14)",
  },
  "rose-gold": {
    label: "Rose Gold",
    bg: "#2b121a", bgRaised: "#3d1a26",
    bgLight: "#e6c1ce", bgLightRaised: "#daa9ba",
    ink: "#f6eef1", inkDim: "#d2bcc3",
    inkOnLight: "#3b1623", inkOnLightDim: "#734554",
    gold: "#c63968", goldSoft: "#d3698c", maroon: "#3b9b4b", sage: "#404077",
    borderDark: "rgba(255,255,255,0.14)", borderDarkStrong: "rgba(255,255,255,0.26)",
    borderLight: "rgba(0,0,0,0.14)",
  },
  "midnight-purple": {
    label: "Midnight Purple",
    bg: "#1c122b", bgRaised: "#281a3d",
    bgLight: "#d1c1e6", bgLightRaised: "#bea9da",
    ink: "#f2eef6", inkDim: "#c5bcd2",
    inkOnLight: "#26163b", inkOnLightDim: "#584573",
    gold: "#7439c6", goldSoft: "#9569d3", maroon: "#9b933b", sage: "#40776a",
    borderDark: "rgba(255,255,255,0.14)", borderDarkStrong: "rgba(255,255,255,0.26)",
    borderLight: "rgba(0,0,0,0.14)",
  },
  "sunset-amber": {
    label: "Sunset Amber",
    bg: "#2b1e12", bgRaised: "#3d2a1a",
    bgLight: "#e6d2c1", bgLightRaised: "#dac0a9",
    ink: "#f6f2ee", inkDim: "#d2c6bc",
    inkOnLight: "#3b2816", inkOnLightDim: "#735a45",
    gold: "#c67b39", goldSoft: "#d39b69", maroon: "#3b9b98", sage: "#6c4077",
    borderDark: "rgba(255,255,255,0.14)", borderDarkStrong: "rgba(255,255,255,0.26)",
    borderLight: "rgba(0,0,0,0.14)",
  },
  "ocean-teal": {
    label: "Ocean Teal",
    bg: "#122b2b", bgRaised: "#1a3d3c",
    bgLight: "#c1e6e5", bgLightRaised: "#a9dad9",
    ink: "#eef6f6", inkDim: "#bcd2d1",
    inkOnLight: "#163b3a", inkOnLightDim: "#457371",
    gold: "#39c6c1", goldSoft: "#69d3d0", maroon: "#9b3b6e", sage: "#677740",
    borderDark: "rgba(255,255,255,0.14)", borderDarkStrong: "rgba(255,255,255,0.26)",
    borderLight: "rgba(0,0,0,0.14)",
  },
  "berry-wine": {
    label: "Berry Wine",
    bg: "#2b1223", bgRaised: "#3d1a31",
    bgLight: "#e6c1da", bgLightRaised: "#daa9ca",
    ink: "#f6eef4", inkDim: "#d2bccb",
    inkOnLight: "#3b162f", inkOnLightDim: "#734563",
    gold: "#c63997", goldSoft: "#d369b0", maroon: "#4b9b3b", sage: "#405377",
    borderDark: "rgba(255,255,255,0.14)", borderDarkStrong: "rgba(255,255,255,0.26)",
    borderLight: "rgba(0,0,0,0.14)",
  },
  "forest-moss": {
    label: "Forest Moss",
    bg: "#1a2b12", bgRaised: "#263d1a",
    bgLight: "#cee6c1", bgLightRaised: "#badaa9",
    ink: "#f1f6ee", inkDim: "#c3d2bc",
    inkOnLight: "#233b16", inkOnLightDim: "#547345",
    gold: "#68c639", goldSoft: "#8cd369", maroon: "#4b3b9b", sage: "#774040",
    borderDark: "rgba(255,255,255,0.14)", borderDarkStrong: "rgba(255,255,255,0.26)",
    borderLight: "rgba(0,0,0,0.14)",
  },
  "terracotta-clay": {
    label: "Terracotta Clay",
    bg: "#2b1812", bgRaised: "#3d231a",
    bgLight: "#e6cbc1", bgLightRaised: "#dab6a9",
    ink: "#f6f0ee", inkDim: "#d2c1bc",
    inkOnLight: "#3b2016", inkOnLightDim: "#735045",
    gold: "#c65c39", goldSoft: "#d38369", maroon: "#3b9b83", sage: "#604077",
    borderDark: "rgba(255,255,255,0.14)", borderDarkStrong: "rgba(255,255,255,0.26)",
    borderLight: "rgba(0,0,0,0.14)",
  },
  "lavender-dusk": {
    label: "Lavender Dusk",
    bg: "#16122b", bgRaised: "#201a3d",
    bgLight: "#c8c1e6", bgLightRaised: "#b1a9da",
    ink: "#f0eef6", inkDim: "#bfbcd2",
    inkOnLight: "#1d163b", inkOnLightDim: "#4c4573",
    gold: "#5139c6", goldSoft: "#7b69d3", maroon: "#9b7b3b", sage: "#40775c",
    borderDark: "rgba(255,255,255,0.14)", borderDarkStrong: "rgba(255,255,255,0.26)",
    borderLight: "rgba(0,0,0,0.14)",
  },
  "crimson-ember": {
    label: "Crimson Ember",
    bg: "#2b1214", bgRaised: "#3d1a1d",
    bgLight: "#e6c1c4", bgLightRaised: "#daa9ad",
    ink: "#f6eeef", inkDim: "#d2bcbe",
    inkOnLight: "#3b1619", inkOnLightDim: "#734549",
    gold: "#c63945", goldSoft: "#d36972", maroon: "#3b9b63", sage: "#4e4077",
    borderDark: "rgba(255,255,255,0.14)", borderDarkStrong: "rgba(255,255,255,0.26)",
    borderLight: "rgba(0,0,0,0.14)",
  },
  "peacock-cyan": {
    label: "Peacock Cyan",
    bg: "#12272b", bgRaised: "#1a373d",
    bgLight: "#c1e0e6", bgLightRaised: "#a9d2da",
    ink: "#eef5f6", inkDim: "#bcced2",
    inkOnLight: "#16353b", inkOnLightDim: "#456b73",
    gold: "#39aec6", goldSoft: "#69c2d3", maroon: "#9b3b5b", sage: "#5c7740",
    borderDark: "rgba(255,255,255,0.14)", borderDarkStrong: "rgba(255,255,255,0.26)",
    borderLight: "rgba(0,0,0,0.14)",
  },
  "saffron-marigold": {
    label: "Saffron Marigold",
    bg: "#2b2212", bgRaised: "#3d301a",
    bgLight: "#e6d9c1", bgLightRaised: "#dac8a9",
    ink: "#f6f3ee", inkDim: "#d2cabc",
    inkOnLight: "#3b2e16", inkOnLightDim: "#736245",
    gold: "#c69239", goldSoft: "#d3ac69", maroon: "#3b8e9b", sage: "#764077",
    borderDark: "rgba(255,255,255,0.14)", borderDarkStrong: "rgba(255,255,255,0.26)",
    borderLight: "rgba(0,0,0,0.14)",
  },
  "plum-velvet": {
    label: "Plum Velvet",
    bg: "#27122b", bgRaised: "#371a3d",
    bgLight: "#e0c1e6", bgLightRaised: "#d2a9da",
    ink: "#f5eef6", inkDim: "#cebcd2",
    inkOnLight: "#35163b", inkOnLightDim: "#6b4573",
    gold: "#ae39c6", goldSoft: "#c269d3", maroon: "#7b9b3b", sage: "#406e77",
    borderDark: "rgba(255,255,255,0.14)", borderDarkStrong: "rgba(255,255,255,0.26)",
    borderLight: "rgba(0,0,0,0.14)",
  },
  "steel-slate": {
    label: "Steel Slate",
    bg: "#12212b", bgRaised: "#1a2e3d",
    bgLight: "#c1d7e6", bgLightRaised: "#a9c6da",
    ink: "#eef3f6", inkDim: "#bcc9d2",
    inkOnLight: "#162c3b", inkOnLightDim: "#456073",
    gold: "#398bc6", goldSoft: "#69a7d3", maroon: "#9b3b43", sage: "#4e7740",
    borderDark: "rgba(255,255,255,0.14)", borderDarkStrong: "rgba(255,255,255,0.26)",
    borderLight: "rgba(0,0,0,0.14)",
  },
  "olive-harvest": {
    label: "Olive Harvest",
    bg: "#272b12", bgRaised: "#373d1a",
    bgLight: "#e0e6c1", bgLightRaised: "#d2daa9",
    ink: "#f5f6ee", inkDim: "#ced2bc",
    inkOnLight: "#353b16", inkOnLightDim: "#6b7345",
    gold: "#aec639", goldSoft: "#c2d369", maroon: "#3b5b9b", sage: "#77405c",
    borderDark: "rgba(255,255,255,0.14)", borderDarkStrong: "rgba(255,255,255,0.26)",
    borderLight: "rgba(0,0,0,0.14)",
  },
  "coral-reef": {
    label: "Coral Reef",
    bg: "#2b1512", bgRaised: "#3d1f1a",
    bgLight: "#e6c6c1", bgLightRaised: "#dab0a9",
    ink: "#f6efee", inkDim: "#d2bfbc",
    inkOnLight: "#3b1b16", inkOnLightDim: "#734b45",
    gold: "#c64c39", goldSoft: "#d37769", maroon: "#3b9b78", sage: "#5a4077",
    borderDark: "rgba(255,255,255,0.14)", borderDarkStrong: "rgba(255,255,255,0.26)",
    borderLight: "rgba(0,0,0,0.14)",
  },
  "indigo-night": {
    label: "Indigo Night",
    bg: "#12142b", bgRaised: "#1a1d3d",
    bgLight: "#c1c4e6", bgLightRaised: "#a9adda",
    ink: "#eeeff6", inkDim: "#bcbed2",
    inkOnLight: "#16193b", inkOnLightDim: "#454973",
    gold: "#3945c6", goldSoft: "#6972d3", maroon: "#9b633b", sage: "#40774e",
    borderDark: "rgba(255,255,255,0.14)", borderDarkStrong: "rgba(255,255,255,0.26)",
    borderLight: "rgba(0,0,0,0.14)",
  },
  "mint-fresh": {
    label: "Mint Fresh",
    bg: "#122b1c", bgRaised: "#1a3d28",
    bgLight: "#c1e6d1", bgLightRaised: "#a9dabe",
    ink: "#eef6f2", inkDim: "#bcd2c5",
    inkOnLight: "#163b26", inkOnLightDim: "#457358",
    gold: "#39c674", goldSoft: "#69d395", maroon: "#933b9b", sage: "#776a40",
    borderDark: "rgba(255,255,255,0.14)", borderDarkStrong: "rgba(255,255,255,0.26)",
    borderLight: "rgba(0,0,0,0.14)",
  },
};

export const DEFAULT_THEME_KEY = "royal-gold";
const LOCAL_KEY = "ck-site-theme";
// Snapshot of the actual resolved CSS variable values (not just the theme
// key) — a tiny inline script in <head> of index.html reads this directly
// and applies it before the page paints, so there is zero flash even
// before this module has a chance to run.
const LOCAL_VARS_KEY = "ck-site-theme-vars";

const THEME_DOC = doc(db, "siteConfig", "theme");

// Maps preset object keys -> actual CSS variable names in :root.
const VAR_MAP = {
  bg: "--bg",
  bgRaised: "--bg-raised",
  bgLight: "--bg-light",
  bgLightRaised: "--bg-light-raised",
  ink: "--ink",
  inkDim: "--ink-dim",
  inkOnLight: "--ink-on-light",
  inkOnLightDim: "--ink-on-light-dim",
  gold: "--gold",
  goldSoft: "--gold-soft",
  maroon: "--maroon",
  sage: "--sage",
  borderDark: "--border-dark",
  borderDarkStrong: "--border-dark-strong",
  borderLight: "--border-light",
};

/** Overwrites every mapped CSS variable on :root — the whole page recolors at once. */
export function applySiteTheme(themeKey) {
  const key = THEME_PRESETS[themeKey] ? themeKey : DEFAULT_THEME_KEY;
  const preset = THEME_PRESETS[key];
  const root = document.documentElement;
  Object.entries(VAR_MAP).forEach(([presetField, cssVar]) => {
    root.style.setProperty(cssVar, preset[presetField]);
  });
  root.setAttribute("data-site-theme", key);
  try {
    localStorage.setItem(LOCAL_KEY, key);
    const resolvedVars = {};
    Object.entries(VAR_MAP).forEach(([presetField, cssVar]) => {
      resolvedVars[cssVar] = preset[presetField];
    });
    localStorage.setItem(LOCAL_VARS_KEY, JSON.stringify(resolvedVars));
  } catch (err) {
    // localStorage unavailable (private mode etc.) — safe to ignore.
  }
}

/**
 * Applies whatever theme is cached in localStorage, synchronously,
 * with no network wait. Call this FIRST, before anything else, so the
 * visitor never sees the default (un-themed) colours even for a
 * moment. Does nothing if nothing is cached yet (first-ever visit).
 */
export function applyCachedThemeInstantly() {
  try {
    const cached = localStorage.getItem(LOCAL_KEY);
    if (cached && THEME_PRESETS[cached]) applySiteTheme(cached);
  } catch (err) {
    // localStorage unavailable — the Firestore fetch below still covers it.
  }
}

/** Reads the currently saved theme key from Firestore, defaulting safely. */
export async function getActiveSiteTheme() {
  try {
    const snap = await getDoc(THEME_DOC);
    if (snap.exists() && THEME_PRESETS[snap.data().activeTheme]) {
      return snap.data().activeTheme;
    }
  } catch (err) {
    console.warn("Site theme lookup failed, using default:", err);
  }
  return DEFAULT_THEME_KEY;
}

/** Admin-only: persists the chosen theme key so it applies everywhere. */
export async function saveActiveSiteTheme(themeKey) {
  await setDoc(
    THEME_DOC,
    { activeTheme: themeKey, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

/**
 * Call once on page load (public site). Applies the cached theme
 * instantly (no flash), then quietly checks Firestore in case the
 * theme changed from another device/tab, and re-applies if so.
 */
export async function initSiteTheme() {
  applyCachedThemeInstantly();

  const themeKey = await getActiveSiteTheme();
  applySiteTheme(themeKey);

  // Listen for admin theme changes in real time.
  // No page reload is required.
  onSnapshot(
    THEME_DOC,
    (snapshot) => {
      if (!snapshot.exists()) return;

      const latestTheme = snapshot.data().activeTheme;

      if (latestTheme && THEME_PRESETS[latestTheme]) {
        applySiteTheme(latestTheme);
      }
    },
    (error) => {
      console.warn("Real-time theme listener failed:", error);
    }
  );

  return themeKey;
}
