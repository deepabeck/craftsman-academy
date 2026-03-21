import { Divider } from "@/components/ui";
import { rgba } from "@/lib/utils";
import type { WeatherData } from "@/lib/weather";

interface WeatherWidgetProps {
  color: string;
  weather: WeatherData | null;
}

export function WeatherWidget({ color, weather }: WeatherWidgetProps) {
  if (!weather) {
    return (
      <div
        className="glass"
        style={{
          padding: "14px 16px",
          borderColor: rgba(color, 0.28),
          background: rgba(color, 0.07),
          fontSize: 12,
          color: "#506070",
          textAlign: "center",
        }}
      >
        Weather unavailable
      </div>
    );
  }

  return (
    <div
      className="glass"
      style={{ padding: "14px 16px", borderColor: rgba(color, 0.28), background: rgba(color, 0.07) }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div
            style={{
              fontSize: 10,
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
          <div style={{ fontSize: 12, color: "#9AABBC", marginTop: 2 }}>{weather.condition}</div>
          <div style={{ fontSize: 10, color: "#506070", marginTop: 1 }}>
            H:{weather.high}&deg; L:{weather.low}&deg;
          </div>
        </div>
        <div style={{ fontSize: 42, lineHeight: 1 }}>{weather.icon}</div>
      </div>
      <Divider />
      <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
        {weather.hourly.map((h) => (
          <div key={h.t} className="hourly-item">
            <div style={{ fontSize: 9, color: "#506070" }}>{h.t}</div>
            <div style={{ fontSize: 15, margin: "2px 0" }}>{h.icon}</div>
            <div style={{ fontSize: 10, color: "#9AABBC" }}>{h.temp}&deg;</div>
          </div>
        ))}
      </div>
    </div>
  );
}
