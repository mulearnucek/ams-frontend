"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "./theme_toggle";
import { ProfileBtn } from "./profile";
import Logo from "../logo";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between px-2 sm:px-8 border-b">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-between gap-2">
          <Logo className="h-10 w-10 dark:invert"/> 
          <span className="hidden sm:block">/</span> 
          <div className="gap-2 items-center-safe font-bold hidden sm:flex rounded-sm text-xs bg-muted px-3 py-1 m-2">
            <img src="/logo-ucek.svg" alt="UCEK Logo" width={40} height={40} className="dark:invert"/>
            University College of Engineering, <br/>
            Kariavattom
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <ThemeToggle />
        <ProfileBtn />
      </div>
    </header>
  );
}

function getPageTitle(path: string) {
  if (path.startsWith("/attendance")) return "Attendance Dashboard";
  if (path.startsWith("/students")) return "Students";
  if (path.startsWith("/settings")) return "Settings";
  return "Dashboard";
}