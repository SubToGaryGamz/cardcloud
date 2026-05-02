import { Capacitor } from "@capacitor/core";

/**
 * True when the app is running inside a Capacitor-wrapped native shell (iOS/Android),
 * false in the regular web browser.
 *
 * Use this to gate features that aren't allowed by Apple's App Store guidelines —
 * specifically external billing (Stripe Checkout) for in-app digital goods.
 * Pro features themselves remain accessible to users who already upgraded via web.
 */
export const isNativePlatform = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const nativePlatform = () => {
  try {
    return Capacitor.getPlatform();
  } catch {
    return "web";
  }
};
