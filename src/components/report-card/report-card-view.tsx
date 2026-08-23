"use client";

import { useState, useTransition } from "react";
import { generateReportCard, updateReportCardNotes } from "@/app/actions/report-cards";
import { Icon, PageHeader, ProgBar, StatusBadge } from "@/components/ui";
import { gradeLabel, rgba } from "@/lib/utils";

export interface SubjectBreakdownItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  total: number;
  completed: number;
  completion_pct: number | null;
  avg_score: number | null;
}

export interface ReportCardData {
  id: string;
  generatedAt: string;
  totalTasks: number;
  completedTasks: number;
  missedTasks: number;
  overallCompletionPct: number | null;
  overallAvgScore: number | null;
  submissionCount: number;
  journalEntryCount: number;
  cogsBalanceSnapshot: number | null;
  subjectBreakdown: SubjectBreakdownItem[];
  parentNotes: string;
}

export interface MissionEntry {
  id: string;
  date: string;
  subjectName: string;
  subjectIcon: string;
  subjectColor: string;
  status: string;
  score: number | null;
}

export interface SubmissionEntry {
  id: string;
  date: string;
  subjectName: string;
  type: string;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
}

export interface JournalEntryItem {
  id: string;
  date: string;
  prompt: string;
  text: string | null;
}

interface GradeArchiveViewProps {
  studentName: string;
  studentColor: string;
  schoolYearId: string;
  grade: number;
  yearLabel: string;
  dateRangeLabel: string;
  reportCard: ReportCardData | null;
  missions: MissionEntry[];
  submissions: SubmissionEntry[];
  journalEntries: JournalEntryItem[];
  canEdit: boolean;
}

type Tab = "report-card" | "missions" | "submissions" | "journal";

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function GradeArchiveView({
  studentName,
  studentColor,
  schoolYearId,
  grade,
  yearLabel,
  dateRangeLabel,
  reportCard,
  missions,
  submissions,
  journalEntries,
  canEdit,
}: GradeArchiveViewProps) {
  const [tab, setTab] = useState<Tab>("report-card");
  const [notes, setNotes] = useState(reportCard?.parentNotes ?? "");
  const [isPending, startTransition] = useTransition();
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const handleGenerate = () => {
    startTransition(async () => {
      const res = await generateReportCard(schoolYearId);
      setSavedMsg(res.error ? `Error: ${res.error}` : "Report card generated.");
    });
  };

  const handleSaveNotes = () => {
    if (!reportCard) return;
    startTransition(async () => {
      const res = await updateReportCardNotes(reportCard.id, notes);
      setSavedMsg(res.error ? `Error: ${res.error}` : "Notes saved.");
    });
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "report-card", label: "Report Card", icon: "approved" },
    { id: "missions", label: "Mission Log", icon: "history" },
    { id: "submissions", label: "Submissions", icon: "submit" },
    { id: "journal", label: "Writing Journal", icon: "reading-writing" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PageHeader
        icon="completed"
        title={`${gradeLabel(grade)} Archive`}
        sub={`${studentName} · ${yearLabel} · ${dateRangeLabel}`}
      />

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              border: `1px solid ${tab === t.id ? rgba(studentColor, 0.55) : "rgba(255,255,255,0.08)"}`,
              background: tab === t.id ? rgba(studentColor, 0.14) : "rgba(0,0,0,0.24)",
              color: tab === t.id ? "#EEE4CC" : "#7A8B9C",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <Icon name={t.icon} size={22} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "report-card" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {!reportCard ? (
            <div className="glass-warm" style={{ padding: 24, textAlign: "center" }}>
              <div style={{ color: "#A09070", marginBottom: 14 }}>
                No report card has been generated for this year yet.
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isPending}
                  className="cinzel brass"
                  style={{
                    padding: "10px 20px",
                    borderRadius: 8,
                    border: "1px solid rgba(232,168,32,0.4)",
                    background: "rgba(232,168,32,0.12)",
                    cursor: "pointer",
                  }}
                >
                  {isPending ? "Generating…" : "Generate Report Card"}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Certificate-style summary panel */}
              <div
                className="glass-warm"
                style={{ padding: 22, border: `1px solid ${rgba(studentColor, 0.35)}`, position: "relative" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div className="cinzel brass" style={{ fontSize: 12, letterSpacing: "0.18em", marginBottom: 4 }}>
                      CERTIFICATE OF RECORD
                    </div>
                    <div className="cinzel metal-text" style={{ fontSize: 24, fontWeight: 900 }}>
                      {studentName} — {gradeLabel(grade)}
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={isPending}
                      style={{
                        fontSize: 12,
                        color: "#7A8B9C",
                        background: "none",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 6,
                        padding: "5px 10px",
                        cursor: "pointer",
                      }}
                    >
                      {isPending ? "Regenerating…" : "↻ Regenerate"}
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
                  {(
                    [
                      [
                        "Completion",
                        reportCard.overallCompletionPct != null ? `${reportCard.overallCompletionPct}%` : "—",
                        studentColor,
                      ],
                      [
                        "Avg Score",
                        reportCard.overallAvgScore != null ? `${reportCard.overallAvgScore}%` : "—",
                        "#5BAA60",
                      ],
                      ["Missions Done", `${reportCard.completedTasks}/${reportCard.totalTasks}`, "#E8A820"],
                      ["Journal Entries", String(reportCard.journalEntryCount), "#9BA4F0"],
                    ] as const
                  ).map(([label, value, color]) => (
                    <div
                      key={label}
                      style={{
                        textAlign: "center",
                        padding: 12,
                        borderRadius: 8,
                        background: "rgba(0,0,0,0.28)",
                        border: `1px solid ${rgba(color, 0.28)}`,
                      }}
                    >
                      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
                      <div style={{ fontSize: 12, color: "#506070", marginTop: 3 }}>{label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 12, color: "#506070", marginBottom: 4 }}>
                  Generated {formatDate(reportCard.generatedAt.slice(0, 10))} · {reportCard.submissionCount} materials
                  submitted
                  {reportCard.cogsBalanceSnapshot != null &&
                    ` · Cogs balance at the time: ${reportCard.cogsBalanceSnapshot}`}
                </div>
              </div>

              {/* Per-subject breakdown */}
              <div className="glass" style={{ padding: 16 }}>
                <div className="cinzel brass" style={{ fontSize: 13, marginBottom: 12 }}>
                  Per-Subject Breakdown
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {reportCard.subjectBreakdown.map((s) => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Icon name={s.icon} size={30} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#EEE4CC", marginBottom: 3 }}>{s.name}</div>
                        <ProgBar value={s.completion_pct ?? 0} color={s.color} />
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, minWidth: 90 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>
                          {s.completion_pct != null ? `${s.completion_pct}%` : "—"}
                        </div>
                        <div style={{ fontSize: 12, color: "#506070" }}>
                          {s.completed}/{s.total}
                          {s.avg_score != null && ` · avg ${s.avg_score}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="glass" style={{ padding: 16 }}>
                <div className="cinzel brass" style={{ fontSize: 13, marginBottom: 10 }}>
                  Parent Notes
                </div>
                {canEdit ? (
                  <>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Reflections on this school year — what went well, what to focus on next…"
                      rows={5}
                      style={{
                        width: "100%",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8,
                        color: "#EEE4CC",
                        padding: 10,
                        fontSize: 14,
                        resize: "vertical",
                      }}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={handleSaveNotes}
                        disabled={isPending}
                        className="cinzel"
                        style={{
                          padding: "7px 16px",
                          borderRadius: 7,
                          border: "1px solid rgba(232,168,32,0.4)",
                          background: "rgba(232,168,32,0.12)",
                          color: "#E8A820",
                          cursor: "pointer",
                          fontSize: 13,
                        }}
                      >
                        Save Notes
                      </button>
                      {savedMsg && <span style={{ fontSize: 12, color: "#7A8B9C" }}>{savedMsg}</span>}
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      fontSize: 14,
                      color: reportCard.parentNotes ? "#EEE4CC" : "#506070",
                      fontStyle: reportCard.parentNotes ? "normal" : "italic",
                    }}
                  >
                    {reportCard.parentNotes || "No notes yet."}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "missions" && (
        <div className="glass" style={{ padding: 16 }}>
          {missions.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: "#506070" }}>
              No missions recorded for this year.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {missions.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    borderRadius: 8,
                    background: "rgba(0,0,0,0.24)",
                    border: `1px solid ${rgba(m.subjectColor, 0.18)}`,
                  }}
                >
                  <Icon name={m.subjectIcon} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#EEE4CC" }}>{m.subjectName}</div>
                    <div style={{ fontSize: 12, color: "#506070" }}>{formatDate(m.date)}</div>
                  </div>
                  {m.score != null && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: studentColor }}>{Math.round(m.score)}%</span>
                  )}
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "submissions" && (
        <div className="glass" style={{ padding: 16 }}>
          {submissions.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: "#506070" }}>No materials submitted this year.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {submissions.map((s) => (
                <div key={s.id} className="glass-warm" style={{ padding: 10 }}>
                  <div style={{ fontSize: 12, color: "#7A8B9C", marginBottom: 4 }}>
                    {s.subjectName} · {formatDate(s.date)}
                  </div>
                  {s.fileUrl && s.type === "photo" ? (
                    // biome-ignore lint/performance/noImgElement: signed URL, not a static asset
                    <img
                      src={s.fileUrl}
                      alt={s.fileName ?? "submission"}
                      style={{ width: "100%", borderRadius: 6, display: "block" }}
                    />
                  ) : s.fileUrl ? (
                    <a href={s.fileUrl} target="_blank" rel="noreferrer" style={{ color: "#E8A820", fontSize: 13 }}>
                      {s.fileName ?? "View file"}
                    </a>
                  ) : (
                    <div style={{ fontSize: 13, color: "#C8B080", whiteSpace: "pre-wrap" }}>{s.content ?? "—"}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "journal" && (
        <div className="glass" style={{ padding: 16 }}>
          {journalEntries.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: "#506070" }}>
              No writing journal entries this year.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {journalEntries.map((j) => (
                <div key={j.id} className="glass-warm" style={{ padding: 12 }}>
                  <div style={{ fontSize: 12, color: "#7A8B9C", marginBottom: 4 }}>{formatDate(j.date)}</div>
                  <div style={{ fontSize: 13, color: "#9BA4F0", fontStyle: "italic", marginBottom: 6 }}>{j.prompt}</div>
                  <div style={{ fontSize: 14, color: "#EEE4CC", whiteSpace: "pre-wrap" }}>
                    {j.text ?? "(no response saved)"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
