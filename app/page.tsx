"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import Logo from "@/components/logo";

export default function Home() {
    const { data: session, isPending } = authClient.useSession();
    const router = useRouter();

    useEffect(() => {
        if (session != null && !isPending) {
            router.replace("/dashboard");
        }
    }, [session, isPending, router]);

    if (isPending || session != null) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            <Logo />

            <main className="flex w-full max-w-3xl flex-col items-center justify-center px-16 py-8">
                <div className="flex items-center gap-4 mt-4">
                    <Link href="/signin">
                        <Button variant={"outline"}>Sign In</Button>
                    </Link>
                </div>
            </main>
        </div>
    );
}