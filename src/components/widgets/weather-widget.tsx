import { Divider } from "@/components/ui";
import { rgba } from "@/lib/utils";
import type { WeatherData } from "@/lib/weather";

interface WeatherWidgetProps {
  color: string;
  weather: WeatherData | null;
  wide?: boolean;
}

export function WeatherWidget({ color, weather, wide }: WeatherWidgetProps) {
  if (!weather) {
    return (
      <div
        className="glass"
        style={{
          padding: "14px 16px",
          borderColor: rgba(color, 0.28),
          fontSize: 13,
          color: "#506070",
          textAlign: "center",
        }}
      >
        Weather unavailable
      </div>
    );
  }

  if (wide) {
    return (
      <div className="glass" style={{ padding: "16px 20px", borderColor: rgba(color, 0.28) }}>
        {/* Current conditions — horizontal strip */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 46, lineHeight: 1, flexShrink: 0 }}>{weather.icon}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, flex: 1, flexWrap: "wrap" }}>
            <div style={{ fontSize: 32, fontWeight: 300, color: "#EEE4CC", lineHeight: 1 }}>
              {weather.temp}&deg;
              <span style={{ fontSize: 14, color: "#9AABBC", marginLeft: 4 }}>F</span>
            </div>
            <div style={{ fontSize: 14, color: "#9AABBC" }}>{weather.condition}</div>
            <div style={{ fontSize: 13, color: "#506070" }}>
              H:{weather.high}&deg;&ensp;L:{weather.low}&deg;
            </div>
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#506070",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            Boulder, CO
          </div>
        </div>
        <Divider />
        {/* Hourly row */}
        <div style={{ display: "flex", gap: 4, marginTop: 12, justifyContent: "space-between" }}>
          {weather.hourly.map((h) => (
            <div key={h.t} className="hourly-item" style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "#506070" }}>{h.t}</div>
              <div style={{ fontSize: 17, margin: "4px 0" }}>{h.icon}</div>
              <div style={{ fontSize: 13, color: "#9AABBC" }}>{h.temp}&deg;</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Compact card: same details as before (place, temp, conditions, high/low, hourly), tighter vertically.
  return (
    <div className="glass" style={{ padding: "10px 14px", borderColor: rgba(color, 0.28) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>{weather.icon}</div>
        <div style={{ fontSize: 28, fontWeight: 300, color: "#EEE4CC", lineHeight: 1, flexShrink: 0 }}>
          {weather.temp}&deg;
          <span style={{ fontSize: 13, color: "#9AABBC", marginLeft: 3 }}>F</span>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, color: "#9AABBC", lineHeight: 1.25 }}>{weather.condition}</div>
          <div style={{ fontSize: 12, color: "#506070", lineHeight: 1.25 }}>
            H:{weather.high}&deg; L:{weather.low}&deg;
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#506070",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            alignSelf: "flex-start",
            whiteSpace: "nowrap",
          }}
        >
          Boulder, CO
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
        {weather.hourly.map((h) => (
          <div key={h.t} className="hourly-item" style={{ padding: "3px 1px" }}>
            <div style={{ fontSize: 11, color: "#506070", lineHeight: 1.2 }}>{h.t}</div>
            <div style={{ fontSize: 14, lineHeight: 1.25 }}>{h.icon}</div>
            <div style={{ fontSize: 12, color: "#9AABBC", lineHeight: 1.2 }}>{h.temp}&deg;</div>
          </div>
        ))}
      </div>
    </div>
  );
}
