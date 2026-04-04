"use client";

import { useState, useTransition } from "react";
import { approveTask, updateTaskTimer } from "@/app/actions/tasks";
import { Icon, PageHeader, StatusBadge } from "@/components/ui";
import { rgba } from "@/lib/utils";

export interface SubmissionFile {
  id: string;
  type: string;
  content: string | null;
  timerSeconds: number | null;
  fileUrl: string | null;
  fileName: string | null;
  fileMimeType: string | null;
}

export interface SubmissionItem {
  taskId: string;
  taskDate: string;
  status: string;
  lessonDetail: string;
  notes: string;
  timerSeconds: number | null;
  adminNote: string;
  finalScore: number | null;
  hasApprovalPoints: boolean;
  student: { id: string; name: string; color: string; avatarUrl: string | null; studentKey: string };
  subject: { id: string; name: string; icon: string; color: string };
  submissions: SubmissionFile[];
}

interface Props {
  items: SubmissionItem[];
  students: { id: string; name: string; color: string; avatarUrl: string | null; studentKey: string }[];
}

const SCORES = [
  { label: "A — 100%", value: 100 },
  { label: "A — 95%", value: 95 },
  { label: "A — 90%", value: 90 },
  { label: "B — 85%", value: 85 },
  { label: "B — 80%", value: 80 },
  { label: "C — 75%", value: 75 },
  { label: "C — 70%", value: 70 },
  { label: "D — 65%", value: 65 },
  { label: "D — 60%", value: 60 },
  { label: "F — 50%", value: 50 },
];

function formatDate(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatSeconds(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function FilePreview({ sub }: { sub: SubmissionFile }) {
  if (!sub.fileUrl) return null;
  const mime = sub.fileMimeType ?? "";
  if (mime.startsWith("image/")) {
    return (
      <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer">
        {/* biome-ignore lint/performance/noImgElement: dynamic signed URL */}
        <img
          src={sub.fileUrl}
          alt={sub.fileName ?? "submission"}
          style={{
            maxWidth: 200,
            maxHeight: 160,
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer",
          }}
        />
      </a>
    );
  }
  if (mime.startsWith("audio/")) {
    return (
      <div>
        {/* biome-ignore lint/a11y/useMediaCaption: user-uploaded audio */}
        <audio controls src={sub.fileUrl} style={{ width: "100%", maxWidth: 320 }} />
        <div style={{ fontSize: 11, color: "#506070", marginTop: 4 }}>{sub.fileName}</div>
      </div>
    );
  }
  return (
    <a
      href={sub.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-ghost"
      style={{ fontSize: 12, padding: "6px 12px", display: "inline-block" }}
    >
      ↗ {sub.fileName ?? "View File"}
    </a>
  );
}

function EditTimerPanel({
  taskId,
  currentSeconds,
  onSaved,
}: {
  taskId: string;
  currentSeconds: number | null;
  onSaved: (taskId: string, seconds: number) => void;
}) {
  const [minutes, setMinutes] = useState(currentSeconds != null ? Math.round(currentSeconds / 60) : 0);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [, startTransition] = useTransition();

  const handle = () => {
    setErr("");
    startTransition(async () => {
      const result = await updateTaskTimer(taskId, minutes);
      if (result.success) {
        setSaved(true);
        onSaved(taskId, minutes * 60);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setErr(result.error ?? "Failed");
      }
    });
  };

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <input
        type="number"
        min={0}
        max={999}
        value={minutes}
        onChange={(e) => setMinutes(Number(e.target.value))}
        className="inp"
        style={{ width: 70, fontSize: 13, padding: "4px 8px" }}
      />
      <span style={{ fontSize: 13, color: "#506070" }}>minutes</span>
      <button type="button" className="btn-brass" style={{ fontSize: 12, padding: "5px 12px" }} onClick={handle}>
        Save Timer
      </button>
      {saved && <span style={{ fontSize: 12, color: "#70E090", fontWeight: 600 }}>✓ Saved</span>}
      {err && <span style={{ fontSize: 11, color: "#F08080" }}>{err}</span>}
    </div>
  );
}

function GradePanel({ item, onGraded }: { item: SubmissionItem; onGraded: (taskId: string, score: number) => void }) {
  const [score, setScore] = useState(100);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [, startTransition] = useTransition();

  const handle = () => {
    setErr("");
    startTransition(async () => {
      const result = await approveTask(item.taskId, score, note || undefined);
      if (result.success) {
        setDone(true);
        onGraded(item.taskId, score);
      } else {
        setErr(result.error ?? "Failed to save grade");
      }
    });
  };

  if (done) return <span style={{ fontSize: 12, color: "#70E090", fontWeight: 600 }}>✓ Graded & approved</span>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className="inp"
          style={{ fontSize: 12, padding: "4px 8px", width: "auto" }}
        >
          {SCORES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="button" className="btn-brass" style={{ fontSize: 12, padding: "5px 14px" }} onClick={handle}>
          Grade & Approve
        </button>
        {err && <span style={{ fontSize: 11, color: "#F08080" }}>{err}</span>}
      </div>
      <input
        type="text"
        className="inp"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note to student…"
        style={{ fontSize: 12, padding: "5px 10px" }}
      />
    </div>
  );
}

export function SubmissionsClient({ items, students }: Props) {
  const [activeStudentId, setActiveStudentId] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [gradedItems, setGradedItems] = useState<Record<string, number>>({});
  const [timerOverrides, setTimerOverrides] = useState<Record<string, number>>({});

  const filtered = activeStudentId === "all" ? items : items.filter((i) => i.student.id === activeStudentId);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const markGraded = (taskId: string, score: number) => setGradedItems((prev) => ({ ...prev, [taskId]: score }));
  const markTimerSaved = (taskId: string, seconds: number) =>
    setTimerOverrides((prev) => ({ ...prev, [taskId]: seconds }));

  // Group by date
  const byDate: Record<string, SubmissionItem[]> = {};
  for (const item of filtered) {
    if (!byDate[item.taskDate]) byDate[item.taskDate] = [];
    byDate[item.taskDate].push(item);
  }
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}
      >
        <PageHeader icon="history" title="Submissions" sub={`${filtered.length} total submissions`} />
      </div>

      {/* Student filter */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className={activeStudentId === "all" ? "btn-brass" : "btn-ghost"}
          style={{ padding: "7px 16px", fontSize: 13 }}
          onClick={() => setActiveStudentId("all")}
        >
          All Students
        </button>
        {students.map((s) => (
          <button
            key={s.id}
            type="button"
            className={activeStudentId === s.id ? "btn-brass" : "btn-ghost"}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 16px", fontSize: 13 }}
            onClick={() => setActiveStudentId(s.id)}
          >
            {s.avatarUrl && (
              // biome-ignore lint/performance/noImgElement: dynamic avatar
              <img
                src={s.avatarUrl}
                alt={s.name}
                style={{ width: 20, height: 20, borderRadius: 3, objectFit: "cover", objectPosition: "top" }}
              />
            )}
            {s.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#506070" }}>No submissions yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {sortedDates.map((date) => (
            <div key={date}>
              <div
                className="cinzel"
                style={{
                  fontSize: 12,
                  color: "#7A8B9C",
                  letterSpacing: "0.12em",
                  marginBottom: 8,
                  paddingLeft: 2,
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  paddingBottom: 4,
                }}
              >
                {formatDate(date)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {byDate[date].map((item) => {
                  const isOpen = expanded.has(item.taskId);
                  const hasFiles = item.submissions.some((s) => s.fileUrl);
                  const hasText = item.submissions.some((s) => s.content);
                  const effectiveTimer = timerOverrides[item.taskId] ?? item.timerSeconds;
                  const hasTimer = effectiveTimer != null && effectiveTimer > 0;
                  const effectiveScore = gradedItems[item.taskId] ?? item.finalScore;
                  const effectiveStatus = gradedItems[item.taskId] != null ? "approved" : item.status;
                  const needsGrade =
                    gradedItems[item.taskId] == null &&
                    item.finalScore == null &&
                    (item.status === "done" || item.status === "review");

                  return (
                    <div
                      key={item.taskId}
                      style={{
                        borderRadius: 9,
                        background: "rgba(0,0,0,0.28)",
                        border: `1px solid ${rgba(item.subject.color, isOpen ? 0.35 : 0.15)}`,
                        overflow: "hidden",
                      }}
                    >
                      {/* Row header */}
                      <button
                        type="button"
                        onClick={() => toggle(item.taskId)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "11px 14px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <Icon name={item.subject.icon} size={30} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#EEE4CC" }}>{item.subject.name}</span>
                            {activeStudentId === "all" && (
                              <span style={{ fontSize: 12, color: item.student.color, fontWeight: 600 }}>
                                {item.student.name}
                              </span>
                            )}
                          </div>
                          {item.lessonDetail && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "#506070",
                                marginTop: 1,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: isOpen ? "normal" : "nowrap",
                                maxWidth: isOpen ? "none" : 400,
                              }}
                            >
                              {item.lessonDetail}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          {hasFiles && <span style={{ fontSize: 12, color: "#9AABBC" }}>📎</span>}
                          {hasTimer && (
                            <span style={{ fontSize: 12, color: "#9AABBC" }}>⏱ {formatSeconds(effectiveTimer!)}</span>
                          )}
                          {hasText && <span style={{ fontSize: 12, color: "#9AABBC" }}>📝</span>}
                          {effectiveScore != null && (
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#70E090" }}>
                              {Math.round(effectiveScore)}%
                            </span>
                          )}
                          {needsGrade && (
                            <span
                              style={{
                                fontSize: 11,
                                background: "rgba(240,128,128,0.2)",
                                color: "#F08080",
                                padding: "2px 7px",
                                borderRadius: 4,
                              }}
                            >
                              ungraded
                            </span>
                          )}
                          <StatusBadge status={effectiveStatus as never} />
                          <span style={{ color: "#506070", fontSize: 14 }}>{isOpen ? "▲" : "▼"}</span>
                        </div>
                      </button>

                      {/* Expanded content */}
                      {isOpen && (
                        <div style={{ padding: "0 14px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 12 }}>
                            {/* Files */}
                            {item.submissions.filter((s) => s.fileUrl).length > 0 && (
                              <div>
                                <div
                                  style={{ fontSize: 11, color: "#506070", letterSpacing: "0.08em", marginBottom: 6 }}
                                  className="cinzel"
                                >
                                  SUBMITTED FILES
                                </div>
                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                  {item.submissions
                                    .filter((s) => s.fileUrl)
                                    .map((s) => (
                                      <FilePreview key={s.id} sub={s} />
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* Text submissions — all attempts, newest-first, each with unique content */}
                            {item.submissions
                              .filter((s) => s.content && s.type !== "revision_request")
                              .map((s, idx) => (
                                <div key={s.id}>
                                  <div
                                    style={{ fontSize: 11, color: "#506070", letterSpacing: "0.08em", marginBottom: 4 }}
                                    className="cinzel"
                                  >
                                    {idx === 0
                                      ? "LATEST RESPONSE"
                                      : `ATTEMPT ${item.submissions.filter((x) => x.content && x.type !== "revision_request").length - idx}`}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 13,
                                      color: idx === 0 ? "#9AABBC" : "#6A7B8C",
                                      background: idx === 0 ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.12)",
                                      padding: "8px 12px",
                                      borderRadius: 6,
                                      lineHeight: 1.6,
                                      borderLeft: idx > 0 ? "2px solid rgba(255,255,255,0.06)" : "none",
                                    }}
                                  >
                                    {s.content}
                                  </div>
                                </div>
                              ))}

                            {/* Student notes */}
                            {item.notes && (
                              <div style={{ fontSize: 12, color: "#7A8B9C", fontStyle: "italic" }}>
                                Notes: {item.notes}
                              </div>
                            )}

                            {/* Admin note */}
                            {item.adminNote && (
                              <div style={{ fontSize: 12, color: "#B0A0F0" }}>💬 {item.adminNote}</div>
                            )}

                            {/* Edit timer */}
                            <div>
                              <div
                                style={{ fontSize: 11, color: "#506070", letterSpacing: "0.08em", marginBottom: 6 }}
                                className="cinzel"
                              >
                                TIMER DURATION
                              </div>
                              <EditTimerPanel
                                taskId={item.taskId}
                                currentSeconds={effectiveTimer}
                                onSaved={markTimerSaved}
                              />
                            </div>

                            {/* Grade & approve */}
                            {needsGrade && (
                              <div>
                                <div
                                  style={{ fontSize: 11, color: "#D4A830", letterSpacing: "0.08em", marginBottom: 6 }}
                                  className="cinzel"
                                >
                                  GRADE THIS SUBMISSION
                                </div>
                                <GradePanel item={item} onGraded={markGraded} />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
