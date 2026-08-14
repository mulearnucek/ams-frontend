"use client"
import Link from "next/link"
import Image from "next/image"
import { SignInUserAuthForm } from "./user-auth-form"
import Logo from "@/components/logo"
import { useSearchParams } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FLAGS } from "@/lib/flags"
import { useAuth } from "@/lib/auth-context"
import { ThemeToggle } from "@/components/appshell/theme_toggle"

const GOOGLE_SIGNIN_ERROR_MESSAGES: Record<string, string> = {
  account_not_linked: "This Google account isn't linked to any existing user. Contact your administrator to have your account set up first.",
  signup_disabled: "No account was found for this Google login. Accounts must be created by an administrator before you can sign in.",
  please_restart_the_process: "Something went wrong during sign in. Please try again.",
  state_mismatch: "Your sign-in session expired. Please try again.",
}

export default function AuthenticationPage() {
  const searchParams = useSearchParams()
  const redirectURL = searchParams.get("r") || ""
  const googleError = searchParams.get("error")
  const { config } = useAuth()

  const emailSigninEnabled = config[FLAGS.EMAIL_SIGNIN] !== false
  const googleSigninEnabled = config[FLAGS.GOOGLE_SIGNIN] !== false

  return (
    <>
      <div className="relative flex min-h-screen flex-col md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="absolute right-4 top-4 z-30 rounded-full bg-background/70 shadow-sm backdrop-blur-sm lg:bg-transparent lg:shadow-none lg:backdrop-blur-none">
          <ThemeToggle />
        </div>
        <div className="relative flex h-[45vh] flex-col overflow-hidden bg-muted p-6 text-white lg:h-full lg:p-10 dark:border-r">
          <div 
            className="absolute inset-0 bg-cover bg-center scale-110 lg:scale-100" 
            style={{ backgroundImage: "url('/ucek.jpeg')" }} 
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-20 flex items-center text-lg font-medium">
            <Logo className="mr-2 h-10 w-auto lg:h-14 brightness-0 invert"/>
          </div>
        </div>
        <div className="flex w-full flex-1 items-center justify-center p-4 lg:p-8">
          <div className="mx-auto flex w-full flex-col gap-6 sm:w-87.5">
            {(!emailSigninEnabled && !googleSigninEnabled) ?
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                <div className="rounded-full bg-amber-100 dark:bg-amber-950/40 p-4">
                  <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Account Access is Disabled Temporarily. <br/>
                    Please check back later.
                  </p>
                </div>
              </div> : <>
                <div className="flex flex-col gap-2 text-center">
                  <Image src="/logo-ucek.svg" alt="Logo" width={56} height={56} className="mr-2 w-auto h-14 brightness-0 dark:invert" />
                  <p className="text-muted-foreground text-sm">
                    Sign in with your account to continue.
                  </p>
                </div>
                {googleError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Sign in failed</AlertTitle>
                    <AlertDescription>
                      {GOOGLE_SIGNIN_ERROR_MESSAGES[googleError] || "An error occurred during Google sign in. Please try again."}
                    </AlertDescription>
                  </Alert>
                )}
                <SignInUserAuthForm redirectUrl={redirectURL} emailSigninEnabled={emailSigninEnabled} googleSigninEnabled={googleSigninEnabled} />
                <p className="px-6 text-center text-xs text-muted-foreground">
                  By clicking continue, you agree to our{" "}
                  <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
                    Privacy Policy
                  </Link>
                  .
                </p>
            </>}
          </div>
        </div>
      </div>
    </>
  )
}