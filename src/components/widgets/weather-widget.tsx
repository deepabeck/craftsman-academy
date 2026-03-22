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

  return (
    <div className="glass" style={{ padding: "14px 16px", borderColor: rgba(color, 0.28) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div
            style={{
              fontSize: 13,
              color: "#506070",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            Boulder, CO
          </div>
          <div style={{ fontSize: 34, fontWeight: 300, color: "#EEE4CC", lineHeight: 1 }}>
            {weather.temp}&deg;
            <span style={{ fontSize: 14, color: "#9AABBC", marginLeft: 4 }}>F</span>
          </div>
          <div style={{ fontSize: 13, color: "#9AABBC", marginTop: 2 }}>{weather.condition}</div>
          <div style={{ fontSize: 13, color: "#506070", marginTop: 1 }}>
            H:{weather.high}&deg; L:{weather.low}&deg;
          </div>
        </div>
        <div style={{ fontSize: 42, lineHeight: 1 }}>{weather.icon}</div>
      </div>
      <Divider />
      <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
        {weather.hourly.map((h) => (
          <div key={h.t} className="hourly-item">
            <div style={{ fontSize: 13, color: "#506070" }}>{h.t}</div>
            <div style={{ fontSize: 15, margin: "2px 0" }}>{h.icon}</div>
            <div style={{ fontSize: 13, color: "#9AABBC" }}>{h.temp}&deg;</div>
          </div>
        ))}
      </div>
    </div>
  );
}
