"use client";

import { AttendanceProvider } from "@/app/context/AttendanceContext";

export default function SessionLayout({ children }: { children: React.ReactNode }) {
  return <AttendanceProvider>{children}</AttendanceProvider>;
}
