"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getStudentBalance } from "@/app/actions/points";
import { useAuth } from "@/providers/auth-provider";

interface PointsContextType {
  balance: number | null;
  refreshBalance: (delayMs?: number) => void;
}

const PointsContext = createContext<PointsContextType>({
  balance: null,
  refreshBalance: () => {},
});

export function PointsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  const fetchBalance = useCallback(() => {
    if (!user?.id) return;
    getStudentBalance(user.id)
      .then(setBalance)
      .catch(() => setBalance(0));
  }, [user?.id]);

  // Load on mount
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Optionally delay before re-fetching (points are written via after() server-side)
  const refreshBalance = useCallback(
    (delayMs = 0) => {
      if (delayMs > 0) {
        setTimeout(fetchBalance, delayMs);
      } else {
        fetchBalance();
      }
    },
    [fetchBalance],
  );

  return <PointsContext.Provider value={{ balance, refreshBalance }}>{children}</PointsContext.Provider>;
}

export function usePoints() {
  return useContext(PointsContext);
}
