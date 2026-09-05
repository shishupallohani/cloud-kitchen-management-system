/**
 * festival-settings.js
 * -----------------------------------------------------------------------
 * Simple festival banner settings.
 *
 * Firestore:
 * festivalSettings/settings
 *
 * Fields:
 * - enabled
 * - greeting
 * - bannerUrl
 *
 * This module only handles the website's festival banner.
 * Festival greeting/card will be connected separately.
 * -----------------------------------------------------------------------
 */

import { db } from "./firebase.js";

import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const FESTIVAL_SETTINGS_REF = doc(
  db,
  "festivalSettings",
  "settings"
);

export async function initFestivalBanner() {
  const banner = document.getElementById("festival-banner");
  const image = document.getElementById("festival-banner-image");

  if (!banner || !image) {
    return;
  }

  // Keep banner hidden until valid settings are loaded.
  banner.hidden = true;

  try {
    const snapshot = await getDoc(FESTIVAL_SETTINGS_REF);

    if (!snapshot.exists()) {
      return;
    }

    const data = snapshot.data();

    const enabled = data.enabled === true;
    const bannerUrl = (data.bannerUrl || "").trim();

    // Festival disabled or no banner URL.
    if (!enabled || !bannerUrl) {
      return;
    }

    image.onload = () => {
      banner.hidden = false;
    };

    image.onerror = () => {
      console.error("Festival banner image could not be loaded.");
      banner.hidden = true;
    };

    image.src = bannerUrl;

  } catch (error) {
    console.error(
      "Failed to load festival banner:",
      error
    );

    banner.hidden = true;
  }
}

export async function initFestivalGreeting() {
  const greetingElement =
    document.getElementById("festival-greeting");

  if (!greetingElement) {
    return;
  }

  // Greeting ko default me hide rakho.
  greetingElement.hidden = true;
  greetingElement.textContent = "";

  try {
    const snapshot = await getDoc(FESTIVAL_SETTINGS_REF);

    if (!snapshot.exists()) {
      return;
    }

    const data = snapshot.data();

    const enabled = data.enabled === true;
    const greeting = (data.greeting || "").trim();

    // Festival disabled → greeting hide
    if (!enabled) {
      return;
    }

    // Greeting empty → greeting hide
    if (!greeting) {
      return;
    }

    // Admin ne jo exactly likha hai wahi show hoga.
    greetingElement.textContent = greeting;
    greetingElement.hidden = false;

  } catch (error) {
    console.error(
      "Failed to load festival greeting:",
      error
    );

    greetingElement.hidden = true;
    greetingElement.textContent = "";
  }
}