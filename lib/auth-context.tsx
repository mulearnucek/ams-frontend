"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useRouter, usePathname } from 'next/navigation';

type User = {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'parent';
  firstName?: string;
  lastName?: string;
  phone?: string;
  gender?: string;
  admissionNumber?: string;
  admissionYear?: string;
  candidateCode?: string;
  department?: string;
  dateOfBirth?: string;
  designation?: string;
  dateOfJoining?: string;
  [key: string]: any;
};

type AuthContextType = {
  session: any;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  refetchUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = async () => {
    if (!session) {
      setUser(null);
      setIsLoading(false);
      
      // Redirect to signin if unauthenticated (except on public pages)
      const publicPaths = ['/', '/signin', '/signup'];
      if (!publicPaths.includes(pathname)) {
        router.push('/signin');
      }
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.status === 422) {
        // User needs to complete onboarding
        router.push('/onboarding');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await response.json();
      setUser(userData);
    } catch (err) {
      console.error('Error fetching user:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user data');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isPending) {
      fetchUser();
    }
  }, [session, isPending]);

  const value: AuthContextType = {
    session,
    user,
    isLoading: isPending || isLoading,
    error,
    refetchUser: fetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
