"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Loader2, User, Wrench } from "lucide-react"
import StudentDashboardPage from "./(student)/page"

export default function DashboardPage() {
    const { data: session, isPending } = authClient.useSession()
    const router = useRouter()

    useEffect(() => {
        if (!isPending && !session) {
            router.push("/signin")
        }

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/user`, {
            credentials: "include",
        }).then(async (res) => {
            if (res.status === 422) {
                return router.push("/onboarding?r=/dashboard")
            }
        })
    }, [session, isPending])

    if (isPending) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!session) {
        return null
    }

    const role = (session.user as unknown as { role?: string }).role

    if (role === "student") return <StudentDashboardPage session={session} />
}