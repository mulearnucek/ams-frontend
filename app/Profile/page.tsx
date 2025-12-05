// app/profile/page.tsx
import React from "react";
import Link from "next/link";
import type { User } from "@/components/ui/profile/profile-form";
import ProfileForm from "@/components/ui/profile/profile-form";

export const metadata = {
  title: "Profile - AMS",
};

/**
 * NOTE:
 * - This page no longer uses any demo/mock data.
 * - It expects you to provide a real `user` object (from your auth backend).
 * For now this code shows a safe "You must sign in" state when user is missing.
 */

export default async function ProfilePage() {
  
  const user: User | null = null;

  if (!user) return signedOutView();

  return signedInView(user);
}

/* ---------- Helpers ---------- */

function signedOutView() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto py-24 px-6 text-center">
        <h1 className="text-3xl font-semibold mb-4">Profile</h1>
        <p className="text-gray-600 mb-6">You must be signed in to view or edit your profile.</p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/signin"
            className="rounded-md bg-violet-600 px-4 py-2 text-white hover:bg-violet-700"
          >
            Sign in
          </Link>

          <Link
            href="/"
            className="rounded-md border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}

function signedInView(user: User) {
  
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto py-12 px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold">Profile</h1>
          <p className="text-sm text-gray-500">Manage your account information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left summary (inline) */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border p-6 shadow-sm">
              <div className="flex items-center space-x-4">
                <div
                  className="h-16 w-16 rounded-full bg-violet-600 text-white flex items-center justify-center text-lg font-medium"
                  aria-hidden
                >
                  {(user.firstName?.[0] ?? "U").toUpperCase()}
                </div>

                <div>
                  <div className="text-lg font-semibold">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-sm text-gray-500 capitalize">{user.role}</div>
                </div>
              </div>

              <div className="mt-6 text-sm text-gray-600 space-y-2">
                <div className="flex">
                  <span className="font-medium w-28">Phone:</span>
                  <span>{user.phone ?? "—"}</span>
                </div>

                <div className="flex">
                  <span className="font-medium w-28">Gender:</span>
                  <span>{user.gender ?? "—"}</span>
                </div>

                {user.role === "student" && (
                  <>
                    <div className="flex">
                      <span className="font-medium w-28">Admission No:</span>
                      <span>{user.admNumber ?? "—"}</span>
                    </div>

                    <div className="flex">
                      <span className="font-medium w-28">Department:</span>
                      <span>{user.department ?? "—"}</span>
                    </div>
                  </>
                )}
              </div>
            </div>  
          </div>

          {/* Right form */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border p-6 shadow-sm">
              <ProfileForm initialUser={user} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
