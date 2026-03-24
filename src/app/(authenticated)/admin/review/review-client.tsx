"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { scoreTaskWithAI } from "@/app/actions/ai-score";
import { approveTask, requestRevision } from "@/app/actions/tasks";
import { Icon, PageHeader, StatusBadge } from "@/components/ui";
import { formatTime, rgba } from "@/lib/utils";

export interface ReviewItem {
  taskId: string;
  taskDate: string;
  lessonDetail: string;
  notes: string;
  timerSeconds: number;
  adminNote: string;
  status: string;
  aiScore: number | null;
  aiFeedback: string | null;
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

// ── Date utilities ────────────────────────────────────────────────────────────

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayStr(): string {
  return localDateStr(new Date());
}

function getMondayOf(date: Date, weekOffset = 0): Date {
  const d = new Date(date);
  const dow = d.getDay();
  // On Sunday show the upcoming week (next Monday); otherwise show current week's Monday
  const diff = dow === 0 ? 1 : 1 - dow;
  d.setDate(d.getDate() + diff + weekOffset * 7);
  return d;
}

/** Returns [Mon, Tue, Wed, Thu, Fri] as YYYY-MM-DD strings for the given week offset */
function getWeekDates(weekOffset: number): string[] {
  const monday = getMondayOf(new Date(), weekOffset);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return localDateStr(d);
  });
}

function formatWeekLabel(dates: string[]): string {
  const start = new Date(`${dates[0]}T12:00:00`);
  const end = new Date(`${dates[4]}T12:00:00`);
  const mo: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", mo)} – ${end.toLocaleDateString("en-US", { ...mo, year: "numeric" })}`;
}

function formatDayLabel(date: string): { short: string; num: string } {
  const d = new Date(`${date}T12:00:00`);
  return {
    short: d.toLocaleDateString("en-US", { weekday: "short" }),
    num: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

// ── Media type helpers ────────────────────────────────────────────────────────

type MediaKind = "image" | "audio" | "video" | "pdf" | "other";

function mediaKind(sub: ReviewItem["submissions"][number]): MediaKind {
  const mime = sub.fileMimeType ?? "";
  const ext = (sub.fileName ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (sub.type === "photo" || mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/") || ["mp3", "m4a", "wav", "ogg", "aac"].includes(ext)) return "audio";
  if (mime.startsWith("video/") || ["mp4", "mov", "webm", "avi", "mkv"].includes(ext)) return "video";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  return "other";
}

function kindIcon(k: MediaKind): string {
  return k === "audio" ? "🎵" : k === "video" ? "🎬" : k === "pdf" ? "📑" : k === "image" ? "📷" : "📄";
}

// ── MediaViewer lightbox / player ─────────────────────────────────────────────

interface ViewerState {
  subs: ReviewItem["submissions"];
  index: number;
}

function MediaViewer({ state, onClose }: { state: ViewerState; onClose: () => void }) {
  const [idx, setIdx] = useState(state.index);
  const sub = state.subs[idx];
  const kind = mediaKind(sub);
  const total = state.subs.length;

  const prev = useCallback(() => setIdx((i) => (i - 1 + total) % total), [total]);
  const next = useCallback(() => setIdx((i) => (i + 1) % total), [total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (total > 1 && e.key === "ArrowLeft") prev();
      if (total > 1 && e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next, total]);

  return (
    /* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled via window listener */
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(4,8,18,0.96)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <button
        type="button"
        onClick={onClose}
        style={{
          position: "absolute",
          top: 18,
          right: 22,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "50%",
          width: 36,
          height: 36,
          cursor: "pointer",
          color: "#EEE4CC",
          fontSize: 18,
          lineHeight: "34px",
          textAlign: "center",
        }}
      >
        ×
      </button>

      {total > 1 && (
        <div
          style={{
            position: "absolute",
            top: 22,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 13,
            color: "#506070",
          }}
        >
          {idx + 1} / {total}
        </div>
      )}

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled via window listener */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: kind === "pdf" ? 860 : 780,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}
      >
        {kind === "image" && (
          // biome-ignore lint/performance/noImgElement: dynamic signed Supabase URL
          <img
            key={sub.id}
            src={sub.fileUrl ?? ""}
            alt={sub.fileName ?? "submission"}
            style={{
              maxWidth: "100%",
              maxHeight: "75vh",
              objectFit: "contain",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
            }}
          />
        )}
        {kind === "audio" && (
          <div
            style={{
              width: "100%",
              background: "rgba(20,30,50,0.8)",
              border: "1px solid rgba(232,168,32,0.25)",
              borderRadius: 12,
              padding: 28,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
            <div style={{ fontSize: 14, color: "#EEE4CC", marginBottom: 20 }}>{sub.fileName}</div>
            {/* biome-ignore lint/a11y/useMediaCaption: admin review player */}
            <audio key={sub.id} controls autoPlay src={sub.fileUrl ?? ""} style={{ width: "100%" }} />
          </div>
        )}
        {kind === "video" && (
          <div style={{ width: "100%", borderRadius: 10, overflow: "hidden" }}>
            {/* biome-ignore lint/a11y/useMediaCaption: admin review player */}
            <video
              key={sub.id}
              controls
              autoPlay
              src={sub.fileUrl ?? ""}
              style={{ width: "100%", maxHeight: "72vh", background: "#000", display: "block" }}
            />
          </div>
        )}
        {kind === "pdf" && (
          <div
            style={{
              width: "100%",
              height: "75vh",
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <iframe
              key={sub.id}
              src={`${sub.fileUrl}#toolbar=1&view=FitH`}
              title={sub.fileName ?? "PDF"}
              style={{ width: "100%", height: "100%", border: "none", background: "#fff" }}
            />
          </div>
        )}
        {kind === "other" && (
          <div
            style={{
              background: "rgba(20,30,50,0.8)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: 36,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 14 }}>📄</div>
            <div style={{ fontSize: 14, color: "#EEE4CC", marginBottom: 18 }}>{sub.fileName}</div>
            <div style={{ fontSize: 13, color: "#506070", marginBottom: 20 }}>
              This file type cannot be previewed in the browser.
            </div>
            <a
              href={sub.fileUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "9px 20px",
                background: "rgba(232,168,32,0.15)",
                border: "1px solid rgba(232,168,32,0.4)",
                borderRadius: 6,
                color: "#E8A820",
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              ⬇ Download File
            </a>
          </div>
        )}
        {(kind === "image" || kind === "pdf" || kind === "video") && sub.fileName && (
          <div style={{ fontSize: 13, color: "#506070" }}>{sub.fileName}</div>
        )}
        {total > 1 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {state.subs.map((s, i) => {
              const k = mediaKind(s);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setIdx(i)}
                  style={{
                    width: 50,
                    height: 50,
                    padding: 0,
                    border: `2px solid ${i === idx ? "#E8A820" : "rgba(255,255,255,0.15)"}`,
                    borderRadius: 6,
                    overflow: "hidden",
                    cursor: "pointer",
                    background: "rgba(20,30,50,0.8)",
                    flexShrink: 0,
                  }}
                >
                  {k === "image" ? (
                    // biome-ignore lint/performance/noImgElement: dynamic signed Supabase URL
                    <img src={s.fileUrl ?? ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 20, lineHeight: "50px" }}>{kindIcon(k)}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "50%",
              width: 44,
              height: 44,
              cursor: "pointer",
              color: "#E8A820",
              fontSize: 22,
              lineHeight: "42px",
              textAlign: "center",
            }}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={next}
            style={{
              position: "absolute",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "50%",
              width: 44,
              height: 44,
              cursor: "pointer",
              color: "#E8A820",
              fontSize: 22,
              lineHeight: "42px",
              textAlign: "center",
            }}
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}

// ── Submission thumbnail strip ────────────────────────────────────────────────

function FileThumbs({ subs, onOpen }: { subs: ReviewItem["submissions"]; onOpen: (index: number) => void }) {
  const fileSubs = subs.filter((s) => s.fileUrl);
  if (fileSubs.length === 0) return null;
  return (
    <>
      {fileSubs.map((sub, i) => {
        const k = mediaKind(sub);
        const isImg = k === "image";
        return (
          <button
            key={sub.id}
            type="button"
            onClick={() => onOpen(i)}
            title={sub.fileName ?? "Open attachment"}
            style={{
              position: "relative",
              width: 54,
              height: 46,
              padding: 0,
              borderRadius: 5,
              overflow: "hidden",
              border: "1px solid rgba(232,168,32,0.4)",
              cursor: "pointer",
              background: "rgba(15,25,45,0.8)",
              flexShrink: 0,
            }}
          >
            {isImg ? (
              // biome-ignore lint/performance/noImgElement: dynamic signed Supabase URL
              <img src={sub.fileUrl ?? ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                {kindIcon(k)}
              </div>
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0)",
                transition: "background 0.15s",
                color: "#fff",
                fontSize: 15,
                opacity: 0,
              }}
              className="thumb-hover"
            >
              {isImg ? "🔍" : "▶"}
            </div>
          </button>
        );
      })}
    </>
  );
}

// ── ReviewClient ──────────────────────────────────────────────────────────────

interface ReviewClientProps {
  initialItems: ReviewItem[];
  completedItems: ReviewItem[];
}

export function ReviewClient({ initialItems, completedItems }: ReviewClientProps) {
  const [pending, setPending] = useState<ReviewItem[]>(initialItems);
  const [done, setDone] = useState<ReviewItem[]>(completedItems);

  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDates = getWeekDates(weekOffset);

  // Default to today if it's in this week, else first day with items
  const [selDate, setSelDate] = useState<string>(() => {
    const today = todayStr();
    const allItems = [...initialItems, ...completedItems];
    if (weekDates.includes(today) && allItems.some((i) => i.taskDate === today)) return today;
    return weekDates.find((d) => allItems.some((i) => i.taskDate === d)) ?? weekDates[0];
  });

  // Student filter (within selected day)
  const [filterStudent, setFilterStudent] = useState<string>("all");

  // Selected task for detail panel
  const [selTask, setSelTask] = useState<string | null>(null);
  const [score, setScore] = useState("100");
  const [reviewNote, setReviewNote] = useState("");

  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const [rescoring, setRescoring] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // When week changes, reset day selection to first day with items in new week
  const changeWeek = (offset: number) => {
    const newDates = getWeekDates(offset);
    const allItems = [...pending, ...done];
    const firstWithItems = newDates.find((d) => allItems.some((i) => i.taskDate === d));
    setWeekOffset(offset);
    setSelDate(firstWithItems ?? newDates[0]);
    setSelTask(null);
    setFilterStudent("all");
  };

  // Items for this week (any status)
  const allItems = [...pending, ...done];
  const hasPrevWeek = getWeekDates(weekOffset - 1).some((d) => allItems.some((i) => i.taskDate === d));
  const hasNextWeek = getWeekDates(weekOffset + 1).some((d) => allItems.some((i) => i.taskDate === d));

  // Items for selected day
  const dayPending = pending.filter((i) => i.taskDate === selDate);
  const dayDone = done.filter((i) => i.taskDate === selDate);

  // Unique students in today's pending items (for filter)
  const dayStudents = Array.from(new Map(dayPending.map((i) => [i.student.id, i.student])).values());

  // Filtered pending for selected day
  const dayFiltered = filterStudent === "all" ? dayPending : dayPending.filter((i) => i.student.id === filterStudent);

  // Selected task detail
  const selItem = pending.find((i) => i.taskId === selTask) ?? null;

  const openViewer = (subs: ReviewItem["submissions"], index: number) => {
    const fileSubs = subs.filter((s) => s.fileUrl);
    if (!fileSubs.length) return;
    const target = subs[index]?.fileUrl;
    const newIdx = fileSubs.findIndex((s) => s.fileUrl === target);
    setViewer({ subs: fileSubs, index: newIdx >= 0 ? newIdx : 0 });
  };

  const selectTask = (item: ReviewItem) => {
    setSelTask((prev) => (prev === item.taskId ? null : item.taskId));
    setScore(String(item.aiScore ?? 100));
    setReviewNote("");
  };

  const handleRescore = async (item: ReviewItem) => {
    setRescoring(item.taskId);
    const result = await scoreTaskWithAI(item.taskId);
    setRescoring(null);
    if (result.score != null) {
      setPending((prev) =>
        prev.map((r) => (r.taskId === item.taskId ? { ...r, aiScore: result.score, aiFeedback: result.feedback } : r)),
      );
      setScore(String(result.score));
    }
  };

  const approve = (item: ReviewItem) => {
    const s = Number.parseInt(score, 10);
    const finalScore = Number.isNaN(s) ? 100 : Math.min(100, Math.max(0, s));
    setPending((p) => p.filter((r) => r.taskId !== item.taskId));
    setDone((p) => [{ ...item, status: "approved" }, ...p]);
    setSelTask(null);
    setScore("100");
    setReviewNote("");
    startTransition(async () => {
      const result = await approveTask(item.taskId, finalScore, reviewNote);
      if (!result.success) {
        setPending((p) => [item, ...p]);
        setDone((p) => p.filter((r) => r.taskId !== item.taskId));
      }
    });
  };

  const revise = (item: ReviewItem) => {
    setPending((p) => p.filter((r) => r.taskId !== item.taskId));
    setDone((p) => [{ ...item, status: "needs-revision" }, ...p]);
    setSelTask(null);
    setReviewNote("");
    startTransition(async () => {
      const result = await requestRevision(item.taskId, reviewNote);
      if (!result.success) {
        setPending((p) => [item, ...p]);
        setDone((p) => p.filter((r) => r.taskId !== item.taskId));
      }
    });
  };

  const today = todayStr();

  return (
    <>
      {viewer && <MediaViewer state={viewer} onClose={() => setViewer(null)} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <PageHeader icon="review" title="Review Queue" sub={`${pending.length} awaiting review`} />

        {/* ── Week navigation ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <button
            type="button"
            onClick={() => changeWeek(weekOffset - 1)}
            disabled={!hasPrevWeek}
            style={{
              background: hasPrevWeek ? "rgba(232,168,32,0.1)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${hasPrevWeek ? "rgba(232,168,32,0.35)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 6,
              padding: "5px 14px",
              color: hasPrevWeek ? "#E8A820" : "#3A4A5A",
              cursor: hasPrevWeek ? "pointer" : "default",
              fontSize: 18,
              outline: "none",
            }}
          >
            ‹
          </button>
          <div
            className="cinzel"
            style={{ fontSize: 14, color: "#C8A860", letterSpacing: "0.1em", minWidth: 200, textAlign: "center" }}
          >
            {formatWeekLabel(weekDates)}
          </div>
          <button
            type="button"
            onClick={() => changeWeek(weekOffset + 1)}
            disabled={!hasNextWeek}
            style={{
              background: hasNextWeek ? "rgba(232,168,32,0.1)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${hasNextWeek ? "rgba(232,168,32,0.35)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 6,
              padding: "5px 14px",
              color: hasNextWeek ? "#E8A820" : "#3A4A5A",
              cursor: hasNextWeek ? "pointer" : "default",
              fontSize: 18,
              outline: "none",
            }}
          >
            ›
          </button>
        </div>

        {/* ── 5-day header strip ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {weekDates.map((date) => {
            const { short, num } = formatDayLabel(date);
            const pendingCount = pending.filter((i) => i.taskDate === date).length;
            const doneCount = done.filter((i) => i.taskDate === date).length;
            const isToday = date === today;
            const isSel = date === selDate;
            const hasAny = pendingCount + doneCount > 0;

            return (
              <button
                key={date}
                type="button"
                onClick={() => {
                  setSelDate(date);
                  setSelTask(null);
                  setFilterStudent("all");
                }}
                style={{
                  padding: "12px 8px",
                  borderRadius: 9,
                  border: `1px solid ${
                    isSel ? "rgba(232,168,32,0.7)" : hasAny ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)"
                  }`,
                  background: isSel ? "rgba(20,14,4,0.82)" : hasAny ? "rgba(8,17,30,0.68)" : "rgba(8,17,30,0.52)",
                  boxShadow: isSel ? "0 0 0 2px rgba(232,168,32,0.2)" : "none",
                  cursor: "pointer",
                  textAlign: "center",
                  outline: "none",
                  opacity: hasAny ? 1 : 0.4,
                  transition: "all 0.15s",
                }}
              >
                {/* Day name */}
                <div
                  className="cinzel"
                  style={{
                    fontSize: 13,
                    letterSpacing: "0.12em",
                    color: isSel ? "#E8A820" : isToday ? "#C8D8E8" : "#7A8B9C",
                    marginBottom: 4,
                    fontWeight: isSel ? 700 : 400,
                  }}
                >
                  {short}
                </div>
                {/* Date */}
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: isSel ? "#EEE4CC" : hasAny ? "#B0C0D0" : "#506070",
                    marginBottom: 8,
                  }}
                >
                  {num}
                </div>
                {/* Counts */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                  {pendingCount > 0 && (
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: "rgba(176,160,240,0.22)",
                        color: "#C0B0FF",
                        border: "1px solid rgba(176,160,240,0.3)",
                      }}
                    >
                      {pendingCount} to review
                    </span>
                  )}
                  {doneCount > 0 && (
                    <span
                      style={{
                        fontSize: 13,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: "rgba(112,224,144,0.14)",
                        color: "#70E090",
                        border: "1px solid rgba(112,224,144,0.2)",
                      }}
                    >
                      {doneCount} done ✓
                    </span>
                  )}
                  {!hasAny && <span style={{ fontSize: 13, color: "#3A4A5A" }}>—</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Selected day content ── */}
        {dayPending.length === 0 && dayDone.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 0", color: "#2A3A4A", fontSize: 13 }}>
            No submissions this day
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Pending items for this day */}
            {dayPending.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Student filter pills (only if multiple students) */}
                {dayStudents.length > 1 && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterStudent("all");
                        setSelTask(null);
                      }}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 13,
                        cursor: "pointer",
                        border: `1px solid ${filterStudent === "all" ? "#E8A820" : "rgba(255,255,255,0.12)"}`,
                        background: filterStudent === "all" ? "rgba(232,168,32,0.12)" : "rgba(255,255,255,0.03)",
                        color: filterStudent === "all" ? "#E8A820" : "#7A8B9C",
                      }}
                    >
                      All ({dayPending.length})
                    </button>
                    {dayStudents.map((st) => {
                      const cnt = dayPending.filter((i) => i.student.id === st.id).length;
                      const active = filterStudent === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            setFilterStudent(active ? "all" : st.id);
                            setSelTask(null);
                          }}
                          style={{
                            padding: "3px 10px",
                            borderRadius: 20,
                            fontSize: 13,
                            cursor: "pointer",
                            border: `1px solid ${active ? rgba(st.color, 0.7) : rgba(st.color, 0.25)}`,
                            background: active ? rgba(st.color, 0.15) : "rgba(8,17,30,0.65)",
                            color: active ? st.color : "#7A8B9C",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <span
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 3,
                              background: rgba(st.color, 0.35),
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              fontWeight: 700,
                              color: st.color,
                            }}
                          >
                            {st.name[0]}
                          </span>
                          {st.name} ({cnt})
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Pending cards — 3 per row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9 }}>
                  {dayFiltered.map((item) => {
                    const isSel = selTask === item.taskId;
                    const fileSubs = item.submissions.filter(
                      (s) =>
                        (s.type === "photo" || s.type === "file" || s.type === "audio" || s.type === "video") &&
                        s.fileUrl,
                    );
                    const chips = [
                      ...fileSubs.map((s) => kindIcon(mediaKind(s))),
                      ...item.submissions
                        .filter((s) => s.type === "timer")
                        .map((s) => `⏱ ${formatTime(s.timerSeconds ?? 0)}`),
                      ...item.submissions.filter((s) => s.type === "text" && s.content).map(() => "💬"),
                    ].slice(0, 4);

                    return (
                      <button
                        key={item.taskId}
                        type="button"
                        onClick={() => selectTask(item)}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 9,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s",
                          background: isSel ? "rgba(20,30,50,0.88)" : "rgba(8,17,30,0.72)",
                          border: `1px solid ${isSel ? rgba(item.student.color, 0.65) : rgba(item.student.color, 0.28)}`,
                          boxShadow: isSel ? `0 0 0 2px ${rgba(item.student.color, 0.18)}` : "none",
                          outline: "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                          <Icon name={item.subject.icon} size={22} style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: "#EEE4CC",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {item.subject.name}
                            </div>
                            <div style={{ fontSize: 13, color: rgba(item.student.color, 1), marginTop: 1 }}>
                              {item.student.name}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {chips.length > 0 ? (
                            chips.map((chip) => (
                              <span
                                key={chip}
                                style={{
                                  fontSize: 13,
                                  padding: "2px 7px",
                                  borderRadius: 4,
                                  background: "rgba(255,255,255,0.09)",
                                  color: "#B0C0D0",
                                }}
                              >
                                {chip}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: 13, color: "#506070", fontStyle: "italic" }}>No attachment</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Detail panel */}
                {selItem &&
                  selItem.taskDate === selDate &&
                  (() => {
                    const fileSubs = selItem.submissions.filter(
                      (s) =>
                        (s.type === "photo" || s.type === "file" || s.type === "audio" || s.type === "video") &&
                        s.fileUrl,
                    );
                    const textNote =
                      selItem.submissions.find((s) => s.type === "text" && s.content)?.content ??
                      (selItem.notes || null);
                    const timerSub = selItem.submissions.find((s) => s.type === "timer");

                    return (
                      <div
                        className="glass"
                        style={{
                          borderRadius: 9,
                          border: `1px solid ${rgba(selItem.student.color, 0.35)}`,
                          padding: "12px 14px",
                        }}
                      >
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <Icon name={selItem.subject.icon} size={22} />
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#EEE4CC" }}>
                              {selItem.subject.name}
                            </span>
                            <span style={{ fontSize: 13, color: "#7A8B9C", marginLeft: 8 }}>
                              {selItem.student.name}
                            </span>
                            {selItem.lessonDetail && (
                              <div
                                style={{
                                  fontSize: 13,
                                  color: "#7A8B9C",
                                  marginTop: 2,
                                  borderLeft: `2px solid ${rgba(selItem.subject.color, 0.5)}`,
                                  paddingLeft: 6,
                                }}
                              >
                                {selItem.lessonDetail}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Submissions row */}
                        <div
                          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}
                        >
                          <FileThumbs subs={fileSubs} onOpen={(i) => openViewer(fileSubs, i)} />
                          {timerSub && (
                            <span
                              style={{
                                fontSize: 13,
                                color: "#4ABCCC",
                                background: "rgba(74,188,204,0.1)",
                                border: "1px solid rgba(74,188,204,0.25)",
                                borderRadius: 4,
                                padding: "4px 8px",
                              }}
                            >
                              ⏱ {formatTime(timerSub.timerSeconds ?? 0)}
                            </span>
                          )}
                          {textNote && (
                            <div
                              style={{
                                width: "100%",
                                marginTop: 4,
                                padding: "10px 12px",
                                borderRadius: 6,
                                background: "rgba(0,0,0,0.35)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                fontSize: 14,
                                color: "#D0E0F0",
                                lineHeight: 1.6,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {textNote}
                            </div>
                          )}
                          {fileSubs.length === 0 && !timerSub && !textNote && (
                            <span style={{ fontSize: 13, color: "#506070", fontStyle: "italic" }}>
                              No file or note — send back for revision.
                            </span>
                          )}
                        </div>

                        {/* AI Score row */}
                        {(selItem.aiScore != null || rescoring === selItem.taskId) && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 10,
                              marginBottom: 10,
                              padding: "8px 10px",
                              borderRadius: 6,
                              background: "rgba(0,0,0,0.4)",
                              border: "1px solid rgba(232,168,32,0.2)",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                letterSpacing: "0.1em",
                                color: "#E8A820",
                                background: "rgba(232,168,32,0.15)",
                                border: "1px solid rgba(232,168,32,0.3)",
                                borderRadius: 3,
                                padding: "2px 5px",
                                flexShrink: 0,
                                marginTop: 1,
                              }}
                            >
                              AI
                            </span>
                            {rescoring === selItem.taskId ? (
                              <span style={{ fontSize: 13, color: "#7A8B9C", fontStyle: "italic" }}>Scoring…</span>
                            ) : (
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ fontSize: 15, fontWeight: 700, color: "#E8A820", marginRight: 10 }}>
                                  {selItem.aiScore}%
                                </span>
                                {selItem.aiFeedback && (
                                  <span style={{ fontSize: 13, color: "#B0C0D0", lineHeight: 1.4 }}>
                                    {selItem.aiFeedback}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions row */}
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <input
                            className="inp"
                            type="number"
                            placeholder="Score"
                            value={score}
                            onChange={(e) => setScore(e.target.value)}
                            style={{ width: 70, padding: "5px 8px", fontSize: 13 }}
                            min={0}
                            max={100}
                          />
                          <input
                            className="inp"
                            type="text"
                            placeholder="Note for student (optional)"
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            style={{ flex: 1, padding: "5px 8px", fontSize: 13 }}
                          />
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{
                              padding: "5px 10px",
                              fontSize: 13,
                              whiteSpace: "nowrap",
                              opacity: rescoring === selItem.taskId ? 0.5 : 1,
                            }}
                            onClick={() => handleRescore(selItem)}
                            disabled={rescoring === selItem.taskId}
                          >
                            {rescoring === selItem.taskId ? "Scoring…" : "🤖 AI Score"}
                          </button>
                          <button
                            type="button"
                            className="btn-brass"
                            style={{ padding: "5px 14px", fontSize: 13, whiteSpace: "nowrap" }}
                            onClick={() => approve(selItem)}
                          >
                            ✓ Approve
                          </button>
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: "5px 10px", fontSize: 13, whiteSpace: "nowrap" }}
                            onClick={() => revise(selItem)}
                          >
                            ↩ Revise
                          </button>
                        </div>
                      </div>
                    );
                  })()}
              </div>
            )}

            {/* Completed items for this day */}
            {dayDone.length > 0 && (
              <div>
                <div className="cinzel text-dim" style={{ fontSize: 13, letterSpacing: "0.1em", marginBottom: 6 }}>
                  REVIEWED THIS DAY
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
                  {dayDone.map((item) => (
                    <div
                      key={item.taskId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "9px 12px",
                        borderRadius: 7,
                        opacity: 0.55,
                        background: "rgba(8,17,30,0.65)",
                        border: `1px solid ${rgba(item.student.color, 0.15)}`,
                      }}
                    >
                      <Icon name={item.subject.icon} size={18} style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#C0D0E0",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.subject.name}
                        </div>
                        <div style={{ fontSize: 13, color: rgba(item.student.color, 0.9), marginTop: 1 }}>
                          {item.student.name}
                        </div>
                      </div>
                      <StatusBadge status={item.status as "approved" | "pending" | "review" | "done" | "missed"} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* All-clear for the whole queue */}
        {pending.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#506070" }}>
            <Icon name="completed" size={48} style={{ margin: "0 auto 10px" }} />
            <div className="cinzel" style={{ fontSize: 14 }}>
              All Clear, Commander
            </div>
          </div>
        )}
      </div>
    </>
  );
}
