"use client";

import { useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

interface AuthUser {
  id: string;
  role: "admin" | "student";
  studentId: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (who: string, pin: string) => { success: boolean; error?: string };
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_CREDENTIALS: Record<string, { pin: string; role: "admin" | "student"; studentId: string | null }> = {
  admin: { pin: "1234", role: "admin", studentId: null },
  deven: { pin: "0001", role: "student", studentId: "deven" },
  shaan: { pin: "0002", role: "student", studentId: "shaan" },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading] = useState(false);
  const router = useRouter();

  const signIn = useCallback(
    (who: string, pin: string): { success: boolean; error?: string } => {
      const cred = DEMO_CREDENTIALS[who];
      if (!cred || cred.pin !== pin) {
        return { success: false, error: "Incorrect PIN." };
      }
      setUser({ id: who, role: cred.role, studentId: cred.studentId });
      if (cred.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/student/today");
      }
      return { success: true };
    },
    [router],
  );

  const signOut = useCallback(() => {
    setUser(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(() => ({ user, isLoading, signIn, signOut }), [user, isLoading, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
