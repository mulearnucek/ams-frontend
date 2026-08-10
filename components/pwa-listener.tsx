"use client";

import { useEffect } from "react";
import {
  clearDeferredInstallPrompt,
  setDeferredInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa";

// Renders nothing - exists purely to capture `beforeinstallprompt` at the root
// of the app, before any navigation to /pwa-install could otherwise miss it.
// See lib/pwa.ts for why this can't just live on that page.
export default function PwaListener() {
  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      clearDeferredInstallPrompt();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return null;
}
