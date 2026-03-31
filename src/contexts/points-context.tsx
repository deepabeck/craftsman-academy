"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { UnseenEntry } from "@/app/actions/points";
import { getStudentBalance, getUnseenPoints, markPointsSeen } from "@/app/actions/points";
import { NewPointsModal } from "@/components/modals/new-points-modal";
import { FlyingCogs } from "@/components/ui/flying-cogs";
import { useAuth } from "@/providers/auth-provider";

interface Celebration {
  id: string;
  points: number;
  label?: string;
}

interface PointsContextType {
  balance: number | null;
  refreshBalance: (delayMs?: number) => void;
  celebrate: (points: number, label?: string) => void;
  unseenCount: number;
}

const PointsContext = createContext<PointsContextType>({
  balance: null,
  refreshBalance: () => {},
  celebrate: () => {},
  unseenCount: 0,
});

export function PointsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [unseenEntries, setUnseenEntries] = useState<UnseenEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const loadedRef = useRef(false);

  const fetchBalance = useCallback(() => {
    if (!user?.id) return;
    getStudentBalance(user.id)
      .then(setBalance)
      .catch(() => setBalance(0));
  }, [user?.id]);

  // On mount: load balance + check for unseen points
  useEffect(() => {
    if (!user?.id || loadedRef.current) return;
    loadedRef.current = true;
    fetchBalance();
    getUnseenPoints(user.id).then((entries) => {
      if (entries.length > 0) {
        setUnseenEntries(entries);
        setShowModal(true);
      }
    });
  }, [user?.id, fetchBalance]);

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

  const celebrate = useCallback((points: number, label?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setCelebrations((prev) => [...prev, { id, points, label }]);
  }, []);

  const removeCelebration = useCallback((id: string) => {
    setCelebrations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleModalDismiss = useCallback(() => {
    setShowModal(false);
    setUnseenEntries([]);
    if (user?.id) markPointsSeen(user.id);
    fetchBalance();
  }, [user?.id, fetchBalance]);

  return (
    <PointsContext.Provider value={{ balance, refreshBalance, celebrate, unseenCount: unseenEntries.length }}>
      {children}
      {/* Flying cogs celebrations */}
      {celebrations.map((c) => (
        <FlyingCogs key={c.id} points={c.points} label={c.label} onDone={() => removeCelebration(c.id)} />
      ))}
      {/* Unseen points modal */}
      {showModal && unseenEntries.length > 0 && (
        <NewPointsModal entries={unseenEntries} onDismiss={handleModalDismiss} />
      )}
    </PointsContext.Provider>
  );
}

export function usePoints() {
  return useContext(PointsContext);
}
