"use client";

import Navbar from "./navbar";
import { useEffect, useState } from "react";
import { Bell, BellRing, Book, CalendarDays, Home, Settings } from "lucide-react"
import Dock from '@/components/appshell/Dock';
import { useRouter } from 'next/navigation';
import { Avatar as AvatarIcon, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import Loading from "@/app/loading";
import Avatar, { genConfig } from 'react-nice-avatar'


export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading, session } = useAuth();

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/signin');
    }
  }, [isLoading, session]);

  const items = [
    { icon: <Home size={18} />, label: 'Home', onClick: () => router.push('/dashboard')  },
    { icon: <BellRing size={18} />, label: 'Notifications', onClick: () => router.push('/dashboard/notifications') },
    { icon: <Book size={18} />, label: 'Assignments', onClick: () => router.push('/dashboard/assignments') },
    { icon: <Settings size={18} />, label: 'Settings', onClick: () => alert('Settings!') },
    { 
      icon: (
        user?.image != undefined && user?.image != "" && user?.image != "gen" ?
        <AvatarIcon className="h-6 w-6 sm:h-8 sm:w-8">
          <AvatarImage src={user?.image || ''} alt={user?.name || 'User'} />
          <AvatarFallback className="text-[8px]">{user?.name?.[0] || 'U'}</AvatarFallback>
        </AvatarIcon> :
        <Avatar {...genConfig(user?.email)} sex={user?.gender == "male" ? "man" : "woman"} className="h-6 w-6 sm:h-8 sm:w-8" />
      ), 
      label: 'Profile', 
      onClick: () => router.push('/dashboard/profile') 
    },
  ];

  if(isLoading) {
    return <Loading/>
  }

  return (
    <div className="flex h-screen w-full" suppressHydrationWarning>
      <Dock 
            items={items}
            panelHeight={68}
            baseItemSize={50}
            magnification={70}
            className="mb-6"
        />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Navbar/>
        <div className="flex-1 overflow-auto sm:pb-20">
          {children}
        </div>
      </main>
    </div>
  );
}