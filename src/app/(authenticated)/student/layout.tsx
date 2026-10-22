"use client";

import type { ReactNode } from "react";
import { StudentSidebar } from "@/components/layout/student-sidebar";
import { PointsProvider } from "@/contexts/points-context";
import { BASE_STUDENTS, SUBJECTS_ALL } from "@/lib/constants";
import type { Student } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

export default function StudentLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
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
      <div style={{ height: "100vh", display: "flex", overflow: "hidden" }}>
        <StudentSidebar student={student} />
        <div className="main-scroll">
          <div className="content-wrap">{children}</div>
        </div>
      </div>
    </PointsProvider>
  );
}
