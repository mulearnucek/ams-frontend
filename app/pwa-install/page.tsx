"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, MoreVertical, Share, Smartphone, SquarePlus } from "lucide-react";
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  isAndroid,
  isRunningStandalone,
  markPwaPromptSeenToday,
} from "@/lib/pwa";

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

  const handleAndroidInstall = async () => {
    const prompt = getDeferredInstallPrompt();
    if (!prompt) return;
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

  const deferredPrompt = getDeferredInstallPrompt();

  const androidCard = (
    <Card key="android" className="space-y-4 p-5 text-left">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          A
        </span>
        <h2 className="text-sm font-semibold">Android (Chrome)</h2>
      </div>
      {deferredPrompt ? (
        <Button onClick={handleAndroidInstall} disabled={installing} className="w-full">
          {installing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Install App
        </Button>
      ) : (
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <MoreVertical className="mt-0.5 h-4 w-4 shrink-0" />
            Tap the menu (⋮) in the top-right corner of Chrome
          </li>
          <li className="flex items-start gap-2">
            <SquarePlus className="mt-0.5 h-4 w-4 shrink-0" />
            Select &quot;Install app&quot; or &quot;Add to Home screen&quot;
          </li>
        </ol>
      )}
    </Card>
  );

  const iosCard = (
    <Card key="ios" className="space-y-4 p-5 text-left">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          i
        </span>
        <h2 className="text-sm font-semibold">iOS (Safari)</h2>
      </div>
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
    </Card>
  );

  // Both platforms are always shown - only the order adapts, so the visitor's
  // own device leads without hiding the other one entirely.
  const orderedCards = isAndroid() ? [androidCard, iosCard] : [iosCard, androidCard];

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

      <div className="mx-auto flex max-w-md flex-col gap-6 pt-10 text-center sm:pt-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Smartphone className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Install AMS on your device</h1>
          <p className="text-sm text-muted-foreground">
            Add AMS to your home screen for faster access and a full-screen, app-like experience.
          </p>
        </div>

        {orderedCards}

        <Button variant="outline" onClick={leave} className="w-full">
          Continue to dashboard
        </Button>
      </div>
    </div>
  );
}
