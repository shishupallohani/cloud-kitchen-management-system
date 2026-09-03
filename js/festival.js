/**
 * festival.js
 * -----------------------------------------------------------------------
 * Data-driven festival detection + sitewide theming.
 *
 * Festivals live in Firestore under `festivals/{festivalId}` so the admin
 * can enable/disable them and adjust dates without a deploy. This file
 * also ships a local FALLBACK_FESTIVALS list (used only if Firestore is
 * unreachable) — update both once a year. Nothing about festival *dates*
 * is hardcoded into the UI; only the visual treatment per `theme` key is.
 *
 * When a festival is active, three things happen together:
 *   1. --festival-accent / --festival-accent-2 update — every hover state,
 *      tag, and highlight across the site reads these variables, so the
 *      "jhalak" (glimpse) of the festival shows up everywhere at once,
 *      not just in one banner.
 *   2. A proper banner renders at the top with an icon + greeting.
 *   3. A handful of themed glyphs drift up across the whole page
 *      (skipped entirely if the visitor prefers reduced motion).
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
// an unrecognized theme falls back to "default" (banner only, no extra
// color shift or particles) — so nothing breaks if a theme key is typo'd.
const THEME_TREATMENTS = {
  diwali: {
    accent: "#e7a93a", accent2: "#a4453f", icon: "🪔",
    particles: ["🪔", "✨"], hindi: "दीपों का त्योहार",
  },
  dussehra: {
    accent: "#c9702e", accent2: "#7a2e2e", icon: "🏹",
    particles: ["✨"], hindi: "विजयादशमी की शुभकामनाएं",
  },
  navratri: {
    accent: "#c9528c", accent2: "#7a2e2e", icon: "🌸",
    particles: ["🌸", "✨"], hindi: "नवरात्रि की धूम",
  },
  ganesh_chaturthi: {
    accent: "#d8a23c", accent2: "#a4453f", icon: "🐘",
    particles: ["✨"], hindi: "गणपति बप्पा मोरया",
  },
  raksha_bandhan: {
    accent: "#c9526b", accent2: "#c89b3c", icon: "🎗️",
    particles: ["🎗️"], hindi: "रक्षाबंधन की शुभकामनाएं",
  },
  janmashtami: {
    accent: "#4a6fc0", accent2: "#c89b3c", icon: "🪈",
    particles: ["🪶", "✨"], hindi: "जन्माष्टमी की शुभकामनाएं",
  },
  holi: {
    accent: "#3fa37a", accent2: "#c9528c", icon: "🎨",
    particles: ["🎨", "●"], hindi: "रंगों का त्योहार",
  },
  chhath_puja: {
    accent: "#d97b3f", accent2: "#a4453f", icon: "🌅",
    particles: ["🌅"], hindi: "छठ पूजा की शुभकामनाएं",
  },
  makar_sankranti: {
    accent: "#e0b23c", accent2: "#4c5b4a", icon: "🪁",
    particles: ["🪁"], hindi: "मकर संक्रांति की शुभकामनाएं",
  },
  default: {
    accent: "#e0b955", accent2: "#a4453f", icon: "✨",
    particles: ["✨"], hindi: "त्योहारों की रौनक",
  },
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

function clearParticles() {
  const layer = document.getElementById("festival-particles");
  if (layer) layer.innerHTML = "";
}

function spawnParticles(treatment) {
  const layer = document.getElementById("festival-particles");
  if (!layer) return;
  layer.innerHTML = "";

  const COUNT = 7;
  for (let i = 0; i < COUNT; i++) {
    const span = document.createElement("span");
    span.className = "festival-particle";
    span.textContent = treatment.particles[i % treatment.particles.length];
    span.style.setProperty("--x", `${Math.round(Math.random() * 92 + 4)}%`);
    span.style.setProperty("--delay", `${(Math.random() * 12).toFixed(1)}s`);
    span.style.setProperty("--duration", `${(14 + Math.random() * 8).toFixed(1)}s`);
    span.style.setProperty("--size", `${(1 + Math.random() * 0.8).toFixed(2)}rem`);
    layer.appendChild(span);
  }
}

/**
 * Applies sitewide theming for the given festival (or clears it when
 * festival is null). Respects prefers-reduced-motion for particles.
 */
export function applyFestivalTheme(festival) {
  const root = document.documentElement;
  const banner = document.getElementById("festival-banner");
  const bannerIcon = document.getElementById("festival-banner-icon");
  const bannerText = document.getElementById("festival-banner-text");
  const hindiGreeting = document.getElementById("festival-hindi-greeting");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!festival) {
    root.style.removeProperty("--festival-accent");
    root.style.removeProperty("--festival-accent-2");
    root.removeAttribute("data-festival-active");
    if (banner) banner.hidden = true;
    clearParticles();
    return;
  }

  const treatment = THEME_TREATMENTS[festival.theme] || THEME_TREATMENTS.default;
  root.style.setProperty("--festival-accent", treatment.accent);
  root.style.setProperty("--festival-accent-2", treatment.accent2);
  root.setAttribute("data-festival-active", festival.theme || "default");

  if (banner) {
    banner.hidden = false;
    if (bannerIcon) bannerIcon.textContent = treatment.icon;
    if (bannerText) bannerText.textContent = festival.greeting || festival.name;
  }
  if (hindiGreeting) hindiGreeting.textContent = treatment.hindi;

  if (reduceMotion) {
    clearParticles();
  } else {
    spawnParticles(treatment);
  }
}

export async function initFestivalTheme() {
  const festival = await getActiveFestival();
  applyFestivalTheme(festival);
  return festival;
}
