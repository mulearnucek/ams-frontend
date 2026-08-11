"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Loader2, Share, SquarePlus } from "lucide-react";
import { toast } from "sonner";
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  isIOS,
  isRunningStandalone,
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
      await prompt.userChoice;
    } finally {
      clearDeferredInstallPrompt();
      setInstalling(false);
      leave();
    }
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
            // Always the button, never manual steps - if beforeinstallprompt hasn't
            // landed yet (or this browser never fires it), handleInstallClick falls
            // back to a toast instead of leaving the user with nothing to tap.
            <Button onClick={handleInstallClick} disabled={installing} className="w-full">
              {installing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Install App
            </Button>
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
