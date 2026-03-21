export interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
  high: number;
  low: number;
  hourly: { t: string; icon: string; temp: number }[];
}

/** WMO weather interpretation code → [condition label, emoji] */
const WMO: Record<number, [string, string]> = {
  0: ["Clear", "☀️"],
  1: ["Mostly Clear", "🌤️"],
  2: ["Partly Cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Foggy", "🌫️"],
  48: ["Icy Fog", "🌫️"],
  51: ["Light Drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy Drizzle", "🌦️"],
  61: ["Light Rain", "🌧️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy Rain", "🌧️"],
  66: ["Freezing Rain", "🌨️"],
  67: ["Heavy Freezing Rain", "🌨️"],
  71: ["Light Snow", "❄️"],
  73: ["Snow", "❄️"],
  75: ["Heavy Snow", "❄️"],
  77: ["Snow Grains", "❄️"],
  80: ["Rain Showers", "🌦️"],
  81: ["Showers", "🌦️"],
  82: ["Heavy Showers", "🌧️"],
  85: ["Snow Showers", "🌨️"],
  86: ["Heavy Snow Showers", "🌨️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm", "⛈️"],
  99: ["Thunderstorm", "⛈️"],
};

function wmoInfo(code: number): [string, string] {
  return WMO[code] ?? ["Unknown", "🌡️"];
}

function hourLabel(h: number): string {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

/**
 * Fetches current conditions + daily high/low + next-6-hours forecast
 * for Boulder, CO from Open-Meteo (free, no API key).
 * Cached for 15 minutes via Next.js fetch cache.
 */
export async function fetchWeather(): Promise<WeatherData | null> {
  try {
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      "?latitude=40.015&longitude=-105.2705" +
      "&current=temperature_2m,weathercode" +
      "&daily=temperature_2m_max,temperature_2m_min" +
      "&hourly=temperature_2m,weathercode" +
      "&timezone=America%2FDenver" +
      "&temperature_unit=fahrenheit" +
      "&forecast_days=1";

    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) return null;

    // biome-ignore lint/suspicious/noExplicitAny: external API response
    const data: any = await res.json();

    const [condition, icon] = wmoInfo(Number(data.current.weathercode));

    // Current Denver hour extracted from the API's local-time strings
    // e.g. "2026-03-21T09:00" → 9
    const nowHour = Number(
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: "America/Denver",
      }).format(new Date()),
    );

    // Pick up to 6 upcoming hourly slots
    const times: string[] = data.hourly.time;
    const temps: number[] = data.hourly.temperature_2m;
    const codes: number[] = data.hourly.weathercode;

    const hourly: WeatherData["hourly"] = [];
    for (let i = 0; i < times.length && hourly.length < 6; i++) {
      const h = Number(times[i].slice(11, 13)); // "T09:00" → 9
      if (h < nowHour) continue;
      const [, hIcon] = wmoInfo(codes[i]);
      hourly.push({ t: hourLabel(h), icon: hIcon, temp: Math.round(temps[i]) });
    }

    return {
      temp: Math.round(Number(data.current.temperature_2m)),
      condition,
      icon,
      high: Math.round(Number(data.daily.temperature_2m_max[0])),
      low: Math.round(Number(data.daily.temperature_2m_min[0])),
      hourly,
    };
  } catch {
    return null;
  }
}
