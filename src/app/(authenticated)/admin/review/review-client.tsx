"use client";

import { useState, useTransition } from "react";
import { Icon, PageHeader, StatusBadge } from "@/components/ui";
import { rgba, formatTime } from "@/lib/utils";
import { approveTask, requestRevision } from "@/app/actions/tasks";

export interface ReviewItem {
  taskId: string;
  taskDate: string;
  lessonDetail: string;
  notes: string;
  timerSeconds: number;
  adminNote: string;
  status: string;
  student: {
    id: string;
    name: string;
    color: string;
    avatarUrl: string | null;
    studentKey: string;
  };
  subject: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  submissions: {
    id: string;
    type: string;
    content: string | null;
    timerSeconds: number | null;
    fileUrl: string | null;
    fileName: string | null;
    fileMimeType: string | null;
  }[];
}

interface ReviewClientProps {
  initialItems: ReviewItem[];
  completedItems: ReviewItem[];
}

export function ReviewClient({ initialItems, completedItems }: ReviewClientProps) {
  const [pending, setPending] = useState<ReviewItem[]>(initialItems);
  const [done, setDone] = useState<ReviewItem[]>(completedItems);
  const [sel, setSel] = useState<string | null>(null);
  const [score, setScore] = useState("100");
  const [note, setNote] = useState("");
  const [, startTransition] = useTransition();

  const approve = (item: ReviewItem) => {
    const s = Number.parseInt(score, 10);
    const finalScore = Number.isNaN(s) ? 100 : Math.min(100, Math.max(0, s));

    // Optimistic update
    setPending((p) => p.filter((r) => r.taskId !== item.taskId));
    setDone((p) => [{ ...item, status: "approved" }, ...p]);
    setSel(null);
    setScore("100");
    setNote("");

    startTransition(async () => {
      const result = await approveTask(item.taskId, finalScore, note);
      if (!result.success) {
        // Revert
        setPending((p) => [item, ...p]);
        setDone((p) => p.filter((r) => r.taskId !== item.taskId));
      }
    });
  };

  const revise = (item: ReviewItem) => {
    // Optimistic update
    setPending((p) => p.filter((r) => r.taskId !== item.taskId));
    setDone((p) => [{ ...item, status: "needs-revision" }, ...p]);
    setSel(null);
    setNote("");

    startTransition(async () => {
      const result = await requestRevision(item.taskId, note);
      if (!result.success) {
        setPending((p) => [item, ...p]);
        setDone((p) => p.filter((r) => r.taskId !== item.taskId));
      }
    });
  };

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
        {pending.map((item) => {
          const isOpen = sel === item.taskId;
          return (
            <div
              key={item.taskId}
              onClick={() => { setSel(isOpen ? null : item.taskId); setScore("100"); setNote(""); }}
              onKeyDown={(e) => e.key === "Enter" && setSel(isOpen ? null : item.taskId)}
              role="button"
              tabIndex={0}
              style={{
                padding: 16,
                cursor: "pointer",
                borderRadius: 10,
                transition: "all 0.2s",
                background: rgba(item.student.color, isOpen ? 0.13 : 0.07),
                border: `1px solid ${rgba(item.student.color, isOpen ? 0.42 : 0.22)}`,
              }}
            >
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                {item.student.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.student.avatarUrl}
                    alt={item.student.name}
                    style={{ width: 34, height: 34, objectFit: "cover", borderRadius: 5, border: `2px solid ${rgba(item.student.color, 0.5)}` }}
                  />
                ) : (
                  <div style={{ width: 34, height: 34, borderRadius: 5, background: rgba(item.student.color, 0.3), display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: item.student.color }}>
                      {item.student.name[0]}
                    </span>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#EEE4CC" }}>{item.subject.name}</div>
                  <div style={{ fontSize: 11, color: "#506070" }}>
                    {item.student.name} · {item.taskDate}
                  </div>
                </div>
                <StatusBadge status="review" />
              </div>

              {/* Assignment detail */}
              {item.lessonDetail && (
                <div style={{ fontSize: 11, color: "#7A8B9C", lineHeight: 1.5, marginBottom: 8, borderLeft: `2px solid ${rgba(item.subject.color, 0.5)}`, paddingLeft: 8 }}>
                  {item.lessonDetail}
                </div>
              )}

              {/* Submissions summary */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {item.submissions.map((sub) => (
                  <span
                    key={sub.id}
                    style={{ fontSize: 11, padding: "3px 7px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "#9AABBC" }}
                  >
                    {sub.type === "timer"
                      ? `⏱ ${formatTime(sub.timerSeconds ?? 0)}`
                      : sub.type === "file" || sub.type === "photo"
                        ? `📎 ${sub.fileName ?? "file"}`
                        : sub.type === "text" && sub.content
                          ? `💬 "${sub.content.slice(0, 30)}${sub.content.length > 30 ? "…" : ""}"`
                          : sub.type}
                  </span>
                ))}
                {item.notes && (
                  <span style={{ fontSize: 11, padding: "3px 7px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "#9AABBC" }}>
                    💬 &ldquo;{item.notes.slice(0, 40)}{item.notes.length > 40 ? "…" : ""}&rdquo;
                  </span>
                )}
                {item.submissions.length === 0 && !item.notes && (
                  <span style={{ fontSize: 11, color: "#506070" }}>No submissions</span>
                )}
              </div>

              {/* Expanded review panel */}
              {isOpen && (
                <div
                  style={{ paddingTop: 12, marginTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)" }}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={() => {}}
                >
                  {/* Text submission content */}
                  {item.submissions.filter(s => s.type === "text" && s.content).map(sub => (
                    <div key={sub.id} style={{ fontSize: 12, color: "#B0C0D0", background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "8px 10px", marginBottom: 8, lineHeight: 1.6 }}>
                      {sub.content}
                    </div>
                  ))}

                  {/* Timer submissions */}
                  {item.submissions.filter(s => s.type === "timer").map(sub => (
                    <div key={sub.id} style={{ fontSize: 12, color: "#4ABCCC", marginBottom: 8 }}>
                      ⏱ Timer: {formatTime(sub.timerSeconds ?? 0)}
                    </div>
                  ))}

                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 4 }}>
                    <input
                      className="inp"
                      type="number"
                      placeholder="Score 0–100"
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      style={{ width: 110 }}
                      min={0}
                      max={100}
                    />
                    <input
                      className="inp"
                      type="text"
                      placeholder="Note for student (optional)"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      style={{ flex: 1 }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 9, marginTop: 9 }}>
                    <button
                      type="button"
                      className="btn-brass"
                      style={{ padding: "7px 16px" }}
                      onClick={() => approve(item)}
                    >
                      ✓ Approve
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: "7px 12px" }}
                      onClick={() => revise(item)}
                    >
                      ↩ Needs Revision
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completed section */}
      {done.length > 0 && (
        <>
          <div className="cinzel text-dim" style={{ fontSize: 11, letterSpacing: "0.1em", marginTop: 4 }}>
            COMPLETED
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {done.map((item) => (
              <div
                key={item.taskId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 13px",
                  borderRadius: 9,
                  opacity: 0.6,
                  background: rgba(item.student.color, 0.05),
                  border: `1px solid ${rgba(item.student.color, 0.16)}`,
                }}
              >
                {item.student.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.student.avatarUrl} alt={item.student.name} style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 4 }} />
                )}
                <div style={{ flex: 1, fontSize: 12, color: "#9AABBC" }}>
                  {item.subject.name} · {item.student.name}
                </div>
                <StatusBadge status={item.status as "approved" | "pending" | "review" | "done" | "missed"} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
