"use client";

import type { User } from "@/components/profile/profile-form";
import ProfileForm from "@/components/profile/profile-form";
import Avatar, { genConfig } from 'react-nice-avatar';
import { Avatar as AvatarIcon, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const { data: session, isPending } = authClient.useSession();
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    if(isPending) return;
    if(!session) return router.push("/signin?r=/profile");


    fetch(`${process.env.NEXT_PUBLIC_API_URL}/user`, {
      credentials: "include",
    }).then(async (res) => {
      if (res.ok) {
        const response = await res.json();
        setUser(response.data);
      }
      if (res.status === 422) {
        return router.push("/onboarding?r=/profile");
      }
    });
  }, [session, isPending]);

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </main>
    );
  }
  
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto py-12 px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold">Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your account information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left summary (inline) */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex items-center space-x-4">
                 {(user.user?.image !== undefined && user.user?.image != "" && user.user?.image != "gen" ?
                  <AvatarIcon className="h-16 w-16">
                    <AvatarImage src={user.user?.image || ''} alt={user.user?.first_name || 'User'} />
                    <AvatarFallback className="text-[8px]">{user.user?.first_name?.[0] || 'U'}</AvatarFallback>
                  </AvatarIcon> :
                  <Avatar {...{...genConfig(user?.user.email), sex: user.user?.gender == "male" ? "man" : "woman"}} className="h-16 w-16" />
                )
                }

                <div>
                  <div className="text-lg font-semibold">
                    {user.user.first_name} {user.user.last_name}
                  </div>
                  <div className="text-sm text-muted-foreground capitalize">{user.user.role}</div>
                </div>
              </div>

              <div className="mt-6 text-sm text-muted-foreground space-y-2">
                <div className="flex">
                  <span className="font-medium w-28">Phone:</span>
                  <span>{user.user.phone ?? "—"}</span>
                </div>

                <div className="flex">
                  <span className="font-medium w-28">Gender:</span>
                  <span>{user.user.gender ?? "—"}</span>
                </div>

                {user.user.role === "student" && (
                  <>
                    <div className="flex">
                      <span className="font-medium w-28">Admission No:</span>
                      <span>{user.adm_number ?? "—"}</span>
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
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <ProfileForm initialUser={user} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
