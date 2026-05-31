"use client";

import type { UnseenEntry } from "@/app/actions/points";

interface NewPointsModalProps {
  entries: UnseenEntry[];
  onDismiss: () => void;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  task_submit: { label: "Task Submitted", icon: "⚙️" },
  task_approve: { label: "Task Approved", icon: "✅" },
  daily_submit_bonus: { label: "All Tasks In — Daily Bonus", icon: "🌟" },
  daily_approve_bonus: { label: "All Tasks Approved — Bonus", icon: "🏆" },
  weekly_complete: { label: "Week Complete", icon: "📅" },
  weekly_grade_a: { label: "A Average — Weekly Bonus", icon: "🎓" },
  weekly_grade_b: { label: "B Average — Weekly Bonus", icon: "📚" },
  weekly_perfect: { label: "Perfect Week!", icon: "💎" },
  streak_milestone: { label: "Streak Milestone 🔥", icon: "🔥" },
  manual_award: { label: "Special Award", icon: "🏅" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function NewPointsModal({ entries, onDismiss }: NewPointsModalProps) {
  const total = entries.reduce((sum, e) => sum + e.points, 0);
  // Group by day
  const byDay: Record<string, UnseenEntry[]> = {};
  for (const e of entries) {
    const day = new Date(e.earned_at).toLocaleDateString("en-CA");
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(e);
  }
  const days = Object.keys(byDay).sort((a, b) => b.localeCompare(a));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 8000,
        padding: 20,
      }}
    >
      <div
        className="glass-warm"
        style={{
          width: "100%",
          maxWidth: 480,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(232,168,32,0.35)",
          boxShadow: "0 0 60px rgba(232,168,32,0.12), 0 20px 60px rgba(0,0,0,0.7)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <div className="cinzel" style={{ fontSize: 18, color: "#E8A820", letterSpacing: "0.08em", marginBottom: 4 }}>
            ⚙️ COGS EARNED
          </div>
          <div style={{ fontSize: 13, color: "#7A8B9C" }}>Here's everything you've earned since your last visit</div>
        </div>

        {/* Entries */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
          {days.map((day) => (
            <div key={day} style={{ marginBottom: 14 }}>
              <div
                className="cinzel"
                style={{ fontSize: 11, color: "#506070", letterSpacing: "0.1em", marginBottom: 6 }}
              >
                {formatDate(`${day}T12:00:00`)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {byDay[day].map((e) => {
                  const meta = CATEGORY_LABELS[e.category] ?? { label: e.category, icon: "⚙️" };
                  return (
                    <div
                      key={e.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "rgba(0,0,0,0.22)",
                        border: `1px solid rgba(232,168,32,${e.points > 50 ? "0.35" : "0.12"})`,
                      }}
                    >
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{meta.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "#EEE4CC", fontWeight: 500 }}>{meta.label}</div>
                        {e.note && <div style={{ fontSize: 11, color: "#506070", marginTop: 1 }}>{e.note}</div>}
                      </div>
                      <div
                        className="cinzel"
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: e.points > 0 ? "#E8A820" : "#F08080",
                          flexShrink: 0,
                        }}
                      >
                        {e.points > 0 ? "+" : ""}
                        {e.points}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px 18px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "#506070" }}>Total earned</div>
            <div className="cinzel" style={{ fontSize: 22, fontWeight: 700, color: "#E8A820" }}>
              +{total} Cogs
            </div>
          </div>
          <button
            type="button"
            className="btn-brass"
            style={{ fontSize: 14, padding: "10px 24px" }}
            onClick={onDismiss}
          >
            Collect! ⚙️
          </button>
        </div>
      </div>
    </div>
  );
}
