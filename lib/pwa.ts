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

// Distinguishes "installed but I'm in a plain browser tab right now" from
// "never installed" - isRunningStandalone() alone can't tell these apart,
// since both look identical (a regular browser tab) from inside the tab.
//
// navigator.getInstalledRelatedApps() (Chromium-only; unsupported on iOS
// Safari and Firefox) is the standards-based way to ask this
// (https://stackoverflow.com/questions/56755146), so it's tried first - but in
// practice Chrome's implementation is inconsistent enough that it can't be the
// only signal. INSTALLED_FLAG_KEY backs it up: the moment our own Install
// button succeeds (see app/pwa-install/page.tsx), markPwaInstalled() records
// that fact ourselves, so "Open App" doesn't depend on a flaky browser API
// agreeing with us.
//
// It's a one-way flag by default: no browser fires an event when an installed
// PWA is later removed, so nothing here would ever notice on its own and flip
// it back. clearPwaInstalled() exists for the one place that CAN notice -
// the visitor themselves, via the "Not installed anymore?" fallback link.
type InstalledRelatedAppsNavigator = Navigator & {
  getInstalledRelatedApps?: () => Promise<unknown[]>;
};

const INSTALLED_FLAG_KEY = "ams_pwa_installed";

export function markPwaInstalled() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INSTALLED_FLAG_KEY, "1");
  } catch {
    // Storage can be unavailable (private mode, quota) - worst case this
    // browser falls back to the getInstalledRelatedApps() check alone.
  }
}

export function clearPwaInstalled() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(INSTALLED_FLAG_KEY);
  } catch {
    // Nothing to roll back to - see markPwaInstalled().
  }
}

function hasMarkedPwaInstalled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(INSTALLED_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export async function isPwaInstalled(): Promise<boolean> {
  if (hasMarkedPwaInstalled()) return true;

  if (typeof navigator === "undefined") return false;
  const nav = navigator as InstalledRelatedAppsNavigator;
  if (!nav.getInstalledRelatedApps) return false;
  try {
    const related = await nav.getInstalledRelatedApps();
    return related.length > 0;
  } catch {
    return false;
  }
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
