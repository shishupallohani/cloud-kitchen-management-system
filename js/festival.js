/**
 * festival.js
 * -----------------------------------------------------------------------
 * Data-driven festival detection + subtle theming.
 *
 * Festivals live in Firestore under `festivals/{festivalId}` so the admin
 * can enable/disable them and adjust dates without a deploy. This file
 * also ships a local FALLBACK_FESTIVALS list (used only if Firestore is
 * unreachable) — update both once a year. Nothing about festival *dates*
 * is hardcoded into the UI; only the visual treatment per `theme` key is.
 * -----------------------------------------------------------------------
 */

import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Visual treatment per theme key. Adding a new festival to Firestore with
// an unrecognized theme falls back to "default" (greeting banner only,
// no extra visual effects) — so nothing breaks if a theme key is typo'd.
const THEME_TREATMENTS = {
  diwali: { accent: "#E7A93A", particle: "glow", label: "diya glow" },
  dussehra: { accent: "#C9702E", particle: "glow", label: "warm accents" },
  navratri: { accent: "#B3467C", particle: "pattern", label: "festive pattern" },
  ganesh_chaturthi: { accent: "#D8A23C", particle: "glow", label: "warm accents" },
  raksha_bandhan: { accent: "#C9526B", particle: "pattern", label: "rakhi accents" },
  janmashtami: { accent: "#3E5FA3", particle: "feather", label: "peacock accents" },
  holi: { accent: "#3FA37A", particle: "color", label: "color particles" },
  chhath_puja: { accent: "#D97B3F", particle: "glow", label: "sunrise glow" },
  makar_sankranti: { accent: "#E0B23C", particle: "glow", label: "warm accents" },
  default: { accent: "#C89B3C", particle: "none", label: "" },
};

// Update this list every year, or manage the same data in the
// `festivals` Firestore collection via the admin panel.
const FALLBACK_FESTIVALS = [
  {
    id: "diwali-2026",
    name: "Diwali",
    startDate: "2026-11-08",
    endDate: "2026-11-12",
    theme: "diwali",
    greeting: "Happy Diwali",
    enabled: true,
  },
  {
    id: "navratri-2026",
    name: "Navratri",
    startDate: "2026-10-11",
    endDate: "2026-10-19",
    theme: "navratri",
    greeting: "Shubh Navratri",
    enabled: true,
  },
];

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pickActive(festivals, dateStr) {
  return festivals.find(
    (f) => f.enabled !== false && f.startDate <= dateStr && dateStr <= f.endDate
  );
}

/**
 * Returns the currently active festival object, or null.
 */
export async function getActiveFestival() {
  const dateStr = todayISO();
  try {
    const q = query(collection(db, "festivals"), where("enabled", "==", true));
    const snap = await getDocs(q);
    const festivals = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const active = pickActive(festivals, dateStr);
    if (active) return active;
    // Firestore reachable but nothing configured for today — don't fall
    // back to local sample data in that case, respect the empty result.
    if (festivals.length > 0 || !snap.metadata.fromCache) return null;
    return pickActive(FALLBACK_FESTIVALS, dateStr) || null;
  } catch (err) {
    console.warn("Festival lookup failed, using fallback list:", err);
    return pickActive(FALLBACK_FESTIVALS, dateStr) || null;
  }
}

/**
 * Applies a subtle theme to the page for the given festival (or clears it
 * when festival is null). Respects prefers-reduced-motion.
 */
export function applyFestivalTheme(festival) {
  const root = document.documentElement;
  const banner = document.getElementById("festival-banner");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!festival) {
    root.style.removeProperty("--festival-accent");
    root.removeAttribute("data-festival-particle");
    if (banner) banner.hidden = true;
    return;
  }

  const treatment = THEME_TREATMENTS[festival.theme] || THEME_TREATMENTS.default;
  root.style.setProperty("--festival-accent", treatment.accent);
  root.setAttribute(
    "data-festival-particle",
    reduceMotion ? "none" : treatment.particle
  );

  if (banner) {
    banner.hidden = false;
    banner.textContent = `✨ ${festival.greeting || festival.name} ✨`;
  }
}

export async function initFestivalTheme() {
  const festival = await getActiveFestival();
  applyFestivalTheme(festival);
  return festival;
}
