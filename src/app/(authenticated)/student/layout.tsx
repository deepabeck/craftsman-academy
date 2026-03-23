"use client";

import { type ReactNode, useEffect, useState } from "react";
import { getStudentBalance } from "@/app/actions/points";
import { StudentSidebar } from "@/components/layout/student-sidebar";
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

  const [pointsBalance, setPointsBalance] = useState<number | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    getStudentBalance(user.id)
      .then(setPointsBalance)
      .catch(() => setPointsBalance(0));
  }, [user?.id]);

  return (
    <div style={{ height: "100vh", display: "flex", overflow: "hidden" }}>
      <StudentSidebar student={student} pointsBalance={pointsBalance} />
      <div className="main-scroll">
        <div className="content-wrap">{children}</div>
      </div>
    </div>
  );
}
