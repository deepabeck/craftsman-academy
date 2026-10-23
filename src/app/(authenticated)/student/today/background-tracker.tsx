import Link from "next/link";
import type { DayState, WeekTracker } from "@/lib/week-tracker";

const PIP: Record<DayState, { bg: string; border: string; color: string; mark: string; title: string }> = {
  closed: { bg: "#E8A820", border: "#E8A820", color: "#1a1206", mark: "✓", title: "Closed out" },
  waiting: {
    bg: "rgba(232,168,32,0.18)",
    border: "#E8A820",
    color: "#E8C870",
    mark: "…",
    title: "Done — waiting for review",
  },
  open: { bg: "transparent", border: "rgba(154,171,188,0.6)", color: "#9AABBC", mark: "", title: "Not closed out yet" },
  upcoming: { bg: "transparent", border: "rgba(154,171,188,0.3)", color: "#506070", mark: "", title: "Coming up" },
  off: { bg: "transparent", border: "rgba(154,171,188,0.25)", color: "#506070", mark: "–", title: "No missions" },
};

/** Weekly mystery-background tracker shown at the top of Today's Missions. */
export function BackgroundTracker({ tracker }: { tracker: WeekTracker }) {
  return (
    <div
      className="glass"
      style={{
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        borderColor: "rgba(232,168,32,0.3)",
      }}
    >
      <div style={{ minWidth: 220, flex: 1 }}>
        <div style={{ fontSize: 13, color: "#C8B080", fontWeight: 600, lineHeight: 1.4 }}>
          {tracker.active
            ? "Close out your day, every day, to unlock a mystery background."
            : "Starting Monday: close out your day, every day, to unlock a mystery background."}
        </div>
        <div style={{ fontSize: 12, color: "#9AABBC", marginTop: 2 }}>
          See the{" "}
          <Link href="/student/customize" style={{ color: "#E8C870", textDecoration: "underline" }}>
            Customize page
          </Link>{" "}
          for details.
        </div>
      </div>
      {tracker.active && (
        <div style={{ display: "flex", gap: 8 }} role="img" aria-label="This week's progress">
          {tracker.days.map((d) => {
            const p = PIP[d.state];
            return (
              <div key={d.date} title={`${p.title}`} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: p.bg,
                    border: `2px solid ${p.border}`,
                    color: p.color,
                    fontSize: 14,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: d.isToday ? "0 0 0 3px rgba(232,168,32,0.25)" : "none",
                  }}
                >
                  {p.mark}
                </div>
                <div style={{ fontSize: 11, marginTop: 3, color: d.isToday ? "#E8C870" : "#506070", fontWeight: 600 }}>
                  {d.label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
