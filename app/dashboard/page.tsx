"use client"
import { useAuth } from "@/lib/auth-context";
import StudentDashboardPage from "./(student)/page"

export default function DashboardPage() {
    const {user } = useAuth();

    const role = user?.role

    if (role === "student") return <StudentDashboardPage />
}