"use client";

import { useState, useTransition } from "react";
import { submitTaskProof } from "@/app/actions/tasks";
import { PageHeader, StatusBadge } from "@/components/ui";
import type { Student } from "@/lib/types";
import type { JournalEntry } from "./page";

interface Props {
  student: Student;
  todayEntry: JournalEntry | null;
  pastEntries: JournalEntry[];
  today: string;
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function _formatDateShort(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function JournalClient({ student, todayEntry, pastEntries, today }: Props) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSubmitted =
    submitted ||
    (todayEntry !== null &&
      (todayEntry.status === "done" || todayEntry.status === "review" || todayEntry.status === "approved"));

  const submittedText = submitted ? text : (todayEntry?.submittedText ?? null);

  const handleSubmit = () => {
    if (!todayEntry || !text.trim()) return;
    setSaving(true);
    setError(null);
    startTransition(async () => {
      const result = await submitTaskProof(todayEntry.taskId, {
        text: text.trim(),
        requiresReview: todayEntry.requiresReview,
      });
      setSaving(false);
      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error ?? "Failed to submit. Please try again.");
      }
    });
  };

  // Sentence count hint
  const sentences = text.trim()
    ? text
        .trim()
        .split(/[.!?]+/)
        .filter((s) => s.trim().length > 0).length
    : 0;
  const sentenceColor = sentences >= 3 && sentences <= 5 ? "#70E090" : sentences > 5 ? "#F08080" : "#9AABBC";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader icon="reading-writing" title="Writing Journal" sub={`${formatDate(today)} · write 3–5 sentences`} />

      {/* ── Today's entry ────────────────────────────────────────────── */}
      {todayEntry ? (
        <div
          className="glass"
          style={{
            padding: 24,
            borderColor: `rgba(155,164,240,0.35)`,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Prompt */}
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(155,164,240,0.18)",
                border: "1px solid rgba(155,164,240,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 18,
              }}
            >
              ✦
            </div>
            <div style={{ flex: 1 }}>
              <div
                className="cinzel"
                style={{ fontSize: 13, color: "#9BA4F0", letterSpacing: "0.08em", marginBottom: 8 }}
              >
                TODAY'S PROMPT
              </div>
              <div
                style={{
                  fontSize: 17,
                  color: "#EEE4CC",
                  lineHeight: 1.65,
                  fontStyle: "italic",
                }}
              >
                {todayEntry.prompt || "No prompt set — check back after your parent plans the week."}
              </div>
            </div>
          </div>

          {hasSubmitted ? (
            /* ── Already submitted ─────────────────────────────────── */
            <div
              style={{
                padding: "16px 18px",
                background: "rgba(112,224,144,0.07)",
                border: "1px solid rgba(112,224,144,0.25)",
                borderRadius: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>✓</span>
                <span className="cinzel" style={{ fontSize: 13, color: "#70E090", letterSpacing: "0.06em" }}>
                  ENTRY SUBMITTED
                </span>
                <StatusBadge
                  status={submitted ? (todayEntry.requiresReview ? "review" : "done") : (todayEntry.status as never)}
                />
              </div>
              <div style={{ fontSize: 15, color: "#C8B080", lineHeight: 1.7 }}>{submittedText}</div>
            </div>
          ) : (
            /* ── Write entry ───────────────────────────────────────── */
            <>
              <div style={{ position: "relative" }}>
                <textarea
                  className="inp"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Start writing here… (aim for 3–5 sentences)"
                  style={{
                    minHeight: 140,
                    fontSize: 15,
                    lineHeight: 1.75,
                    paddingBottom: 32,
                    resize: "vertical",
                  }}
                />
                {/* Sentence counter */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 10,
                    right: 12,
                    fontSize: 12,
                    color: sentenceColor,
                    transition: "color 0.2s",
                    pointerEvents: "none",
                  }}
                >
                  {sentences > 0 ? `${sentences} sentence${sentences !== 1 ? "s" : ""}` : ""}
                </div>
              </div>

              {error && <div style={{ fontSize: 13, color: "#F08080" }}>{error}</div>}

              <button
                type="button"
                className="btn-brass"
                onClick={handleSubmit}
                disabled={saving || !text.trim()}
                style={{ alignSelf: "flex-start", padding: "11px 28px", fontSize: 14 }}
              >
                {saving ? "Submitting…" : "Submit Entry"}
              </button>
            </>
          )}
        </div>
      ) : (
        /* ── No task scheduled today ─────────────────────────────────── */
        <div className="glass" style={{ padding: 28, textAlign: "center", borderColor: "rgba(155,164,240,0.2)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📖</div>
          <div className="cinzel" style={{ fontSize: 16, color: "#9BA4F0", marginBottom: 8 }}>
            No Journal Entry Today
          </div>
          <div style={{ fontSize: 14, color: "#506070" }}>
            Your parent hasn't scheduled a Writing Journal for today. Check back tomorrow!
          </div>
        </div>
      )}

      {/* ── Past entries ─────────────────────────────────────────────── */}
      {pastEntries.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="cinzel" style={{ fontSize: 13, color: "#9AABBC", letterSpacing: "0.1em", padding: "0 2px" }}>
            PAST ENTRIES
          </div>

          {pastEntries.map((entry) => {
            const isOpen = expandedId === entry.taskId;
            const hasEntry = !!entry.submittedText;
            return (
              <div
                key={entry.taskId}
                className="glass"
                style={{
                  borderColor: hasEntry ? "rgba(155,164,240,0.22)" : "rgba(255,255,255,0.07)",
                  overflow: "hidden",
                }}
              >
                {/* Row header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : entry.taskId)}
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: hasEntry ? "rgba(155,164,240,0.15)" : "rgba(0,0,0,0.2)",
                      border: `1px solid ${hasEntry ? "rgba(155,164,240,0.35)" : "rgba(255,255,255,0.08)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: 15,
                    }}
                  >
                    {hasEntry ? "✍" : "—"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#C8B080", fontWeight: 600 }}>{formatDate(entry.date)}</div>
                    {entry.prompt && (
                      <div
                        style={{
                          fontSize: 13,
                          color: "#506070",
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 420,
                        }}
                      >
                        {entry.prompt}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={entry.status as never} />
                  <div style={{ fontSize: 13, color: "#3A4858", marginLeft: 4 }}>{isOpen ? "▲" : "▼"}</div>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div
                    style={{
                      padding: "0 18px 18px 18px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {entry.prompt && (
                      <div style={{ paddingTop: 12 }}>
                        <div
                          style={{ fontSize: 12, color: "#9BA4F0", letterSpacing: "0.08em", marginBottom: 6 }}
                          className="cinzel"
                        >
                          PROMPT
                        </div>
                        <div style={{ fontSize: 14, color: "#9AABBC", fontStyle: "italic", lineHeight: 1.6 }}>
                          {entry.prompt}
                        </div>
                      </div>
                    )}
                    <div>
                      <div
                        style={{ fontSize: 12, color: "#9BA4F0", letterSpacing: "0.08em", marginBottom: 6 }}
                        className="cinzel"
                      >
                        ENTRY
                      </div>
                      {entry.submittedText ? (
                        <div style={{ fontSize: 15, color: "#C8B080", lineHeight: 1.75 }}>{entry.submittedText}</div>
                      ) : (
                        <div style={{ fontSize: 14, color: "#3A4858", fontStyle: "italic" }}>No entry submitted.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
