import type { Metadata } from "next";
import AppShell from "@/components/appshell/appshell";

export const metadata: Metadata = {
  title: "AMS - Dashboard",
  description: "Academic Management System - UCEK",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
