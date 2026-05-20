"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      const loginPath = localStorage.getItem("loginPath") ?? "/login";
      router.replace(loginPath);
    }
  }, [user, isLoading, router]);

  if (!user) return null;

  return <>{children}</>;
}
