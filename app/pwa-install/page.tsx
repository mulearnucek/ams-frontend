"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, ExternalLink, Loader2, Share, SquarePlus } from "lucide-react";
import { toast } from "sonner";
import {
  clearDeferredInstallPrompt,
  clearPwaInstalled,
  getDeferredInstallPrompt,
  isIOS,
  isPwaInstalled,
  isRunningStandalone,
  markPwaInstalled,
  markPwaPromptSeenToday,
} from "@/lib/pwa";
import type { UserRole } from "@/lib/types/UserTypes";

// A generic screenshot would look the same for everyone; matching it to the
// visitor's own role turns "here's what app-like means" into "here's what
// you're about to get" - reuses the shots already in public/screenshots
// (see app/page.tsx's marketing preview section) rather than new assets.
const ROLE_PREVIEW: Partial<Record<UserRole, string>> = {
  student: "/screenshots/student-dashboard.jpeg",
  teacher: "/screenshots/teacher-workspace.jpeg",
  parent: "/screenshots/parent-insights.jpeg",
  admin: "/screenshots/admin-overview.jpeg",
  principal: "/screenshots/admin-overview.jpeg",
  hod: "/screenshots/admin-overview.jpeg",
  staff: "/screenshots/admin-overview.jpeg",
};

export default function PwaInstallPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, session, incompleteProfile, isLoading } = useAuth();
  const [installing, setInstalling] = useState(false);
  // Defaults to "not installed" (i.e. the normal install offer) and flips true
  // if the async check below says otherwise - see isPwaInstalled in lib/pwa.ts
  // for why a plain browser tab can't tell this on its own.
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);

  const target = searchParams.get("r") || "/dashboard";

  // Marks today as "handled" either way - a native install prompt the user
  // dismissed is still a choice they made, not a reason to nag again on the
  // very next page load.
  const leave = () => {
    markPwaPromptSeenToday();
    router.replace(target);
  };

  useEffect(() => {
    if (isLoading) return;
    if (!session || !user) {
      router.replace("/signin");
      return;
    }
    if (incompleteProfile) {
      router.replace("/onboarding");
      return;
    }
    // Covers arriving here with the app already installed (e.g. a stale link) -
    // this page has nothing to offer an already-installed user.
    if (isRunningStandalone()) {
      router.replace(target);
    }
  }, [isLoading, session, user, incompleteProfile, target, router]);

  // Distinct from isRunningStandalone(): that's "am I inside the installed
  // app's window right now"; this is "is the app installed somewhere, even
  // though I'm looking at this in a regular browser tab". Chromium-only (see
  // lib/pwa.ts) - on iOS/Firefox this resolves false and changes nothing.
  useEffect(() => {
    let cancelled = false;
    isPwaInstalled().then((installed) => {
      if (!cancelled) setAlreadyInstalled(installed);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // beforeinstallprompt fires on Chromium generally - Android AND desktop
  // Chrome/Edge - so this is "everything except iOS Safari", not literally
  // "Android only". iOS is the one platform with no install API at all.
  const handleInstallClick = async () => {
    const prompt = getDeferredInstallPrompt();
    if (!prompt) {
      // Some browsers (Firefox for Android, some Samsung Internet configs)
      // never fire beforeinstallprompt - there's no programmatic install for
      // them, only the browser's own menu.
      toast.info('Tap your browser\'s menu and choose "Install app" or "Add to Home screen".');
      return;
    }
    setInstalling(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      // This is the one moment we know for certain, from the browser itself,
      // that the install actually went through - record it ourselves rather
      // than leaning on getInstalledRelatedApps() agreeing on the next visit.
      if (choice.outcome === "accepted") {
        markPwaInstalled();
      }
    } finally {
      clearDeferredInstallPrompt();
      setInstalling(false);
      leave();
    }
  };

  // There's no JS API to force-focus a separately-installed PWA window from a
  // browser tab (that's only possible for native-wrapped Trusted Web
  // Activities, not a plain installed web app). A full navigation is the
  // closest honest equivalent: it's what gives Chrome's own link-capturing a
  // chance to hand off to the installed app; router.replace() never leaves
  // the document, so the OS never gets that chance. Worst case if capturing
  // isn't active, this just continues on in the browser tab - not broken,
  // just not a guaranteed app switch.
  const handleOpenApp = () => {
    markPwaPromptSeenToday();
    window.location.href = target;
  };

  // The escape hatch for the one thing this page can't detect on its own: no
  // browser fires an event when its installed PWA gets removed later, so
  // nothing here would ever notice and flip this back automatically. The
  // visitor is the only one who can - this hands them a way to say so.
  const handleNotInstalled = () => {
    clearPwaInstalled();
    setAlreadyInstalled(false);
  };

  if (isLoading || !user || incompleteProfile || isRunningStandalone()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showNativeInstall = !isIOS();
  const previewImage = (user.role && ROLE_PREVIEW[user.role]) || "/screenshots/admin-overview.jpeg";

  return (
    <div className="relative min-h-screen bg-background px-4 py-10 sm:py-16">
      <Button
        variant="ghost"
        size="sm"
        onClick={leave}
        className="absolute right-4 top-4 text-muted-foreground sm:right-8 sm:top-8"
      >
        Skip
      </Button>

      <div className="mx-auto flex max-w-md flex-col items-center gap-6 pt-10 text-center sm:pt-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Download className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Install AMS on your device</h1>
          <p className="text-sm text-muted-foreground">
            Add AMS to your home screen for faster access and a full-screen, app-like experience.
          </p>
        </div>

        {/* A preview of the dashboard the visitor is about to get - without it, a
            single platform's install steps leave a lot of blank page below the
            fold, and this shows rather than just tells what "app-like" means. */}
        <div className="w-full overflow-hidden rounded-2xl border shadow-sm">
          <Image
            src={previewImage}
            alt="Preview of the AMS dashboard"
            width={640}
            height={400}
            className="h-auto w-full"
            priority
          />
        </div>

        <Card className="w-full space-y-4 p-5 text-left">
          {showNativeInstall ? (
            alreadyInstalled ? (
              <div className="space-y-2">
                <Button onClick={handleOpenApp} className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open App
                </Button>
                <button
                  type="button"
                  onClick={handleNotInstalled}
                  className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Not installed anymore? Tap here to install again
                </button>
              </div>
            ) : (
              // Always the button, never manual steps - if beforeinstallprompt
              // hasn't landed yet (or this browser never fires it),
              // handleInstallClick falls back to a toast instead of leaving
              // the user with nothing to tap.
              <Button onClick={handleInstallClick} disabled={installing} className="w-full">
                {installing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Install App
              </Button>
            )
          ) : (
            // No install button here on purpose: unlike Chromium, Safari gives web
            // pages no API to trigger "Add to Home Screen" - Apple requires it go
            // through this exact manual flow, so these two steps are the entire
            // install path on iOS.
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Share className="mt-0.5 h-4 w-4 shrink-0" />
                Tap the Share icon in Safari&apos;s toolbar
              </li>
              <li className="flex items-start gap-2">
                <SquarePlus className="mt-0.5 h-4 w-4 shrink-0" />
                Scroll down and select &quot;Add to Home Screen&quot;
              </li>
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
