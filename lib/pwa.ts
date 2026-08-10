// Chrome's `beforeinstallprompt` fires once, early in the page's lifetime, and
// is not re-dispatched on client-side route changes. A listener mounted only on
// /pwa-install would usually miss it, since users normally arrive there via a
// client-side redirect from elsewhere in the app. PwaListener (mounted at the
// root layout) captures it for the whole session; these are its accessors.
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function setDeferredInstallPrompt(event: BeforeInstallPromptEvent) {
  deferredPrompt = event;
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function clearDeferredInstallPrompt() {
  deferredPrompt = null;
}

// True once the app is actually running as an installed PWA - the only signal
// that can't be faked by dismissing a prompt. Covers Chrome/Edge/Android
// (display-mode) and iOS Safari (the non-standard `navigator.standalone`).
export function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    nav.standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

const PROMPT_LAST_SHOWN_KEY = "ams_pwa_prompt_last_shown";

function todayKey(): string {
  // Local calendar date, not UTC - "each day" should mean the user's day.
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

export function markPwaPromptSeenToday() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROMPT_LAST_SHOWN_KEY, todayKey());
  } catch {
    // Storage can be unavailable (private mode, quota) - worst case the
    // prompt reappears more often than once a day, not a functional break.
  }
}

function hasSeenPwaPromptToday(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(PROMPT_LAST_SHOWN_KEY) === todayKey();
  } catch {
    return false;
  }
}

// Gate used by the dashboard: skip the detour to /pwa-install if the app is
// already installed, or if the user has already seen (or skipped) it today.
export function shouldShowPwaPrompt(): boolean {
  return !isRunningStandalone() && !hasSeenPwaPromptToday();
}
