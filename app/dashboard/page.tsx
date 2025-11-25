"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
    const { data: session, isPending } = authClient.useSession()
    const router = useRouter()

    useEffect(() => {
        if (!isPending && !session) {
            router.push("/signin")
        }
    }, [session, isPending, router])

    if (isPending) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!session) {
        return null // Will redirect via useEffect
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
            <div className="bg-card border rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-2">Welcome back, {session.user.name || session.user.email}!</h2>
                <p className="text-muted-foreground">
                    You have successfully signed in.
                </p>
                <div className="mt-4">
                    <p className="text-sm text-muted-foreground">User ID: {session.user.id}</p>
                    <p className="text-sm text-muted-foreground">Email: {session.user.email}</p>
                    <div className="mt-2">
                        <Button 
                            variant="outline" 
                            onClick={async () => {
                                await authClient.signOut();
                            }}
                        >
                            Sign Out
                        </Button>    
                    </div>
                </div>
            </div>
        </div>
    )
}
