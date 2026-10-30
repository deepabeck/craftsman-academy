"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  type BackgroundState,
  getBackgroundState,
  markBackgroundsRevealed,
  selectBackground,
} from "@/app/actions/backgrounds";
import { StudentSidebar } from "@/components/layout/student-sidebar";
import { BackgroundRevealModal } from "@/components/modals/background-reveal-modal";
import { PointsProvider } from "@/contexts/points-context";
import { BASE_STUDENTS, SUBJECTS_ALL } from "@/lib/constants";
import type { Student } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";

export default function StudentLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { bgColor, setBackground } = useTheme();
  const [bgState, setBgState] = useState<BackgroundState | null>(null);
  const userId = user?.id ?? null;
  const pathname = usePathname();
  const lastCheck = useRef(0);
  const dismissed = useRef(new Set<string>());

  // Load the background collection on sign-in, then re-check when the student moves between pages
  // or returns to the app (at most every 20s). The check also awards the weekly unlock the moment
  // the week is closed out (Friday or later), so the reveal shows up right away.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger, not a value used inside
  useEffect(() => {
    if (!userId) return;
    const check = () => {
      const now = Date.now();
      if (now - lastCheck.current < 20_000) return;
      lastCheck.current = now;
      getBackgroundState().then((s) => {
        if (!s) return;
        setBgState({ ...s, pendingReveal: s.pendingReveal.filter((id) => !dismissed.current.has(id)) });
      });
    };
    check();
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [userId, pathname]);

  const revealId = bgState?.pendingReveal[0] ?? null;
  const finishReveal = (useIt: boolean) => {
    if (!bgState || !revealId) return;
    dismissed.current.add(revealId);
    markBackgroundsRevealed([revealId]);
    if (useIt) {
      setBackground(revealId);
      selectBackground(revealId);
    }
    setBgState({ ...bgState, pendingReveal: bgState.pendingReveal.slice(1) });
  };

  const studentId = user?.studentId || "deven";
  const base = BASE_STUDENTS[studentId] || BASE_STUDENTS.deven;
  const student: Student = {
    ...base,
    color: user?.color ?? base.color,
    // Saved tagline (Admin → Profiles → profiles.tagline) wins over the
    // hardcoded BASE_STUDENTS default, which is only used until the profile loads.
    tagline: user ? user.tagline : base.tagline,
    // Prefer the real uploaded photo (profiles.avatar_url) over the static
    // seed image baked into BASE_STUDENTS — otherwise a new photo uploaded
    // in Admin → Profiles never shows up once a student actually logs in.
    avatar: user?.avatarUrl ?? base.avatar,
    subjects: SUBJECTS_ALL.filter((s) => !s.only || s.only === studentId),
  };

  return (
    <PointsProvider>
      {revealId && (
        <BackgroundRevealModal
          backgroundId={revealId}
          remaining={(bgState?.pendingReveal.length ?? 1) - 1}
          bgColor={bgColor}
          onUse={() => finishReveal(true)}
          onKeep={() => finishReveal(false)}
        />
      )}
      <div style={{ height: "100vh", display: "flex", overflow: "hidden" }}>
        <StudentSidebar student={student} collectionComplete={!!bgState && bgState.ownedIds.length >= bgState.total} />
        <div className="main-scroll">
          <div className="content-wrap">{children}</div>
        </div>
      </div>
    </PointsProvider>
  );
}
