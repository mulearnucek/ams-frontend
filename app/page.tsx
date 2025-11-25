"use client";

import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="w-full flex justify-end mb-8">
            {isPending ? (
                <div className="text-sm text-zinc-500">Loading session...</div>
            ) : session ? (
                <div className="flex items-center gap-4">
                    <div className="text-sm">
                        Logged in as <span className="font-bold">{session.user.email}</span>
                    </div>
                    <Button 
                        variant="outline" 
                        onClick={async () => {
                            await authClient.signOut();
                        }}
                    >
                        Sign Out
                    </Button>
                </div>
            ) : (
                <Link href="/signin">
                    <Button>Sign In</Button>
                </Link>
            )}
        </div>
      </main>
    </div>
  );
}
