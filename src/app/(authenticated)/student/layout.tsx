"use client";

import { type ReactNode } from "react";
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
