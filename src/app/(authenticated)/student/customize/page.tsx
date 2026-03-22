"use client";

import { useState } from "react";
import { HexPicker, PageHeader } from "@/components/ui";
import { BASE_STUDENTS, SUBJECTS_ALL } from "@/lib/constants";
import type { Student } from "@/lib/types";
import { rgba } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";

export default function CustomizePage() {
  const { user } = useAuth();
  const { bgColor, setBgColor } = useTheme();
  const studentId = user?.studentId || "deven";
  const base = BASE_STUDENTS[studentId] || BASE_STUDENTS.deven;

  const [studentColor, setStudentColor] = useState(base.color);
  const student: Student = {
    ...base,
    color: studentColor,
    subjects: SUBJECTS_ALL.filter((s) => !s.only || s.only === studentId),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PageHeader icon="customize" title="Customize" sub="Make it yours" color={student.color} />
      <div className="glass-warm" style={{ padding: 22 }}>
        <div className="cinzel brass" style={{ fontSize: 13, letterSpacing: "0.1em", marginBottom: 16 }}>
          YOUR SIGNATURE COLOR
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 4 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={student.avatar}
            alt={student.name}
            style={{ width: 70, height: "auto", borderRadius: 6, border: `2px solid ${rgba(student.color, 0.6)}` }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: "#9AABBC", marginBottom: 12, lineHeight: 1.6 }}>
              This color appears on your dashboard, progress bars, and cards.
            </div>
            <HexPicker value={student.color} onChange={setStudentColor} />
          </div>
        </div>
      </div>
      <div className="glass-warm" style={{ padding: 22 }}>
        <div className="cinzel brass" style={{ fontSize: 13, letterSpacing: "0.1em", marginBottom: 16 }}>
          WORLD BACKGROUND COLOR
        </div>
        <div style={{ fontSize: 13, color: "#9AABBC", marginBottom: 14, lineHeight: 1.6 }}>
          Tint the Academy&apos;s atmosphere. The steampunk details stay fixed — only the ambient color shifts.
        </div>
        <HexPicker value={bgColor} onChange={setBgColor} label="Hue Tint" />
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 7,
            background: "rgba(0,0,0,0.28)",
            fontSize: 13,
            color: "#404858",
            lineHeight: 1.6,
          }}
        >
          Try deep blues (#1A3A5C), forest greens (#1A3A28), or warm ambers (#3A2010) for different moods.
        </div>
      </div>
    </div>
  );
}
