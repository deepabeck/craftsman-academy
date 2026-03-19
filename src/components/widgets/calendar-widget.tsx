import { MOCK_EVENTS } from "@/lib/constants";
import { rgba } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  holiday: "#E8A820",
  activity: "#4A90D0",
  trip: "#5BAA60",
  birthday: "#C05070",
};

interface CalendarWidgetProps {
  color: string;
}

export function CalendarWidget({ color }: CalendarWidgetProps) {
  return (
    <div
      className="glass"
      style={{ padding: "14px 16px", borderColor: rgba(color, 0.28), background: rgba(color, 0.07) }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>📅</span>
        <div className="cinzel" style={{ fontSize: 11, color: "#D4A830", letterSpacing: "0.08em" }}>
          UPCOMING EVENTS
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {MOCK_EVENTS.map((e) => (
          <div
            key={`${e.date}-${e.label}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "6px 9px",
              borderRadius: 7,
              background: "rgba(0,0,0,0.22)",
              borderLeft: `3px solid ${TYPE_COLORS[e.type] || "#E8A820"}`,
            }}
          >
            <span style={{ fontSize: 14, flexShrink: 0 }}>{e.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "#EEE4CC",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {e.label}
              </div>
              <div style={{ fontSize: 10, color: "#506070" }}>{e.date}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
