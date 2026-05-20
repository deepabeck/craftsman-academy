"use client";

import { useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface AuthUser {
  id: string;
  role: "admin" | "student";
  studentId: string | null; // maps to profiles.student_key ('deven', 'shaan', null for admin)
  color: string;
  name: string;
  tagline: string;
  avatarUrl: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  setUserColor: (color: string) => void;
  setUserAvatarUrl: (url: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const loadProfile = useCallback(
    async (userId: string) => {
      if (!supabase) return;
      const { data } = await supabase
        .from("profiles")
        .select("role, student_key, color, display_name, tagline, avatar_url")
        .eq("id", userId)
        .single();
      if (data) {
        setUser({
          id: userId,
          role: data.role as "admin" | "student",
          studentId: data.student_key ?? null,
          color: data.color ?? "#4A90D0",
          name: data.display_name ?? "",
          tagline: data.tagline ?? "",
          avatarUrl: data.avatar_url ?? null,
        });
      } else {
        setUser(null);
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      if (!supabase) return { success: false, error: "Supabase not configured. Add credentials to .env.local." };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      return { success: true };
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    const loginPath = typeof window !== "undefined" ? (localStorage.getItem("loginPath") ?? "/login") : "/login";
    setUser(null);
    router.push(loginPath);
  }, [supabase, router]);

  const setUserColor = useCallback((color: string) => {
    setUser((prev) => (prev ? { ...prev, color } : prev));
  }, []);

  const setUserAvatarUrl = useCallback((url: string) => {
    setUser((prev) => (prev ? { ...prev, avatarUrl: url } : prev));
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, signIn, signOut, setUserColor, setUserAvatarUrl }),
    [user, isLoading, signIn, signOut, setUserColor, setUserAvatarUrl],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
