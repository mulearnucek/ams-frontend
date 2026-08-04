"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Logo({ className = "" }: { className?: string }) {
    const router = useRouter();
    return (
        <span className="p-2 px-2 rounded-md">
            <Image
                src="/logo.png"
                alt="Logo"
                width={100}
                height={100}
                className={`inline-block dark:invert dark:brightness-0 ${className}`}
                onClick={() => router.push("/")}
                style={{ cursor: "pointer" }}
            />
        </span>
    );
}