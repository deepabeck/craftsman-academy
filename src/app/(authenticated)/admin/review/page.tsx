"use client";

import { useState } from "react";
import { Icon, PageHeader, StatusBadge } from "@/components/ui";
import { BASE_STUDENTS, REVIEW_INIT, SUBJECTS_ALL } from "@/lib/constants";
import type { Review, Student } from "@/lib/types";
import { rgba } from "@/lib/utils";

export default function ReviewPage() {
  const [queue, setQueue] = useState<Review[]>(REVIEW_INIT);
  const [sel, setSel] = useState<string | null>(null);
  const [score, setScore] = useState("");

  const students: Record<string, Student> = {
    deven: { ...BASE_STUDENTS.deven, subjects: SUBJECTS_ALL.filter((s) => !s.only || s.only === "deven") },
    shaan: { ...BASE_STUDENTS.shaan, subjects: SUBJECTS_ALL.filter((s) => !s.only || s.only === "shaan") },
  };

  const approve = (id: string) => {
    setQueue((p) =>
      p.map((r) => (r.id === id ? { ...r, status: "approved" as const, score: Number.parseInt(score, 10) || 100 } : r)),
    );
    setSel(null);
    setScore("");
  };

  const reject = (id: string) => {
    setQueue((p) => p.map((r) => (r.id === id ? { ...r, status: "needs-revision" as const } : r)));
    setSel(null);
  };

  const pending = queue.filter((r) => r.status === "pending");
  const done = queue.filter((r) => r.status !== "pending");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PageHeader icon="review" title="Review Queue" sub={`${pending.length} awaiting review`} />
      {pending.length === 0 && (
        <div style={{ textAlign: "center", padding: 50, color: "#506070" }}>
          <Icon name="completed" size={56} style={{ margin: "0 auto 12px" }} />
          <div className="cinzel" style={{ fontSize: 14 }}>
            All Clear, Commander
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {pending.map((r) => {
          const s = students[r.studentId];
          return (
            <div
              key={r.id}
              onClick={() => setSel(r.id === sel ? null : r.id)}
              onKeyDown={(e) => e.key === "Enter" && setSel(r.id === sel ? null : r.id)}
              role="button"
              tabIndex={0}
              style={{
                padding: 16,
                cursor: "pointer",
                borderRadius: 10,
                transition: "all 0.2s",
                background: rgba(s.color, sel === r.id ? 0.13 : 0.07),
                border: `1px solid ${rgba(s.color, sel === r.id ? 0.42 : 0.22)}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.avatar}
                  alt={s.name}
                  style={{ width: 34, height: "auto", borderRadius: 5, border: `2px solid ${rgba(s.color, 0.5)}` }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#EEE4CC" }}>{r.subjectName}</div>
                  <div style={{ fontSize: 11, color: "#506070" }}>
                    {r.studentName} &middot; {r.date}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: sel === r.id ? 12 : 0 }}>
                {r.files.map((f) => (
                  <span
                    key={f}
                    style={{
                      fontSize: 11,
                      padding: "3px 7px",
                      borderRadius: 4,
                      background: "rgba(255,255,255,0.06)",
                      color: "#9AABBC",
                    }}
                  >
                    {f}
                  </span>
                ))}
              </div>
              {sel === r.id && (
                <div
                  style={{
                    paddingTop: 10,
                    borderTop: "1px solid rgba(255,255,255,0.07)",
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                  }}
                >
                  <input
                    className="inp"
                    type="number"
                    placeholder="Score (0-100)"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    style={{ width: 130 }}
                    min={0}
                    max={100}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    type="button"
                    className="btn-brass"
                    style={{ padding: "7px 14px" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      approve(r.id);
                    }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: "7px 12px" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      reject(r.id);
                    }}
                  >
                    Revise
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {done.length > 0 && (
        <>
          <div className="cinzel text-dim" style={{ fontSize: 11, letterSpacing: "0.1em", marginTop: 4 }}>
            COMPLETED
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {done.map((r) => {
              const s = students[r.studentId];
              return (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "11px 13px",
                    borderRadius: 9,
                    opacity: 0.6,
                    background: rgba(s.color, 0.05),
                    border: `1px solid ${rgba(s.color, 0.16)}`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.avatar} alt={s.name} style={{ width: 28, height: "auto", borderRadius: 4 }} />
                  <div style={{ flex: 1, fontSize: 12, color: "#9AABBC" }}>
                    {r.subjectName} &middot; {r.studentName}
                  </div>
                  <StatusBadge status={r.status} />
                  {r.score && <span style={{ fontSize: 12, fontWeight: 700, color: "#D4A830" }}>{r.score}%</span>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
