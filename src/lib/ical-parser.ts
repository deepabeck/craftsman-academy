import type { CalendarEvent } from "./types";

type EventType = CalendarEvent["type"];

/** Extract the raw value from a DTSTART line (handles TZID and VALUE=DATE params). */
function extractDtValue(line: string): string {
  // e.g. "DTSTART;TZID=America/Denver:20260321T090000" → "20260321T090000"
  //      "DTSTART;VALUE=DATE:20260321"                → "20260321"
  //      "DTSTART:20260321T090000Z"                   → "20260321T090000Z"
  const colonIdx = line.lastIndexOf(":");
  return colonIdx !== -1 ? line.slice(colonIdx + 1) : line;
}

/** Parse YYYYMMDD from a dtstart value string. */
function parseDateOnly(value: string): Date | null {
  const yyyymmdd = value.slice(0, 8);
  if (!/^\d{8}$/.test(yyyymmdd)) return null;
  const y = Number(yyyymmdd.slice(0, 4));
  const m = Number(yyyymmdd.slice(4, 6)) - 1;
  const d = Number(yyyymmdd.slice(6, 8));
  return new Date(y, m, d);
}

/** For FREQ=YEARLY events, project the date to this year (or next if already past). */
function yearlyDate(orig: Date, today: Date): Date {
  const candidate = new Date(today.getFullYear(), orig.getMonth(), orig.getDate());
  return candidate < today ? new Date(today.getFullYear() + 1, orig.getMonth(), orig.getDate()) : candidate;
}

/** Infer event type from summary + categories text. */
function inferType(summary: string, categories: string): EventType {
  const t = `${summary} ${categories}`.toLowerCase();
  if (t.includes("birthday") || t.includes("bday")) return "birthday";
  if (t.includes("holiday") || t.includes("vacation") || t.includes("break") || t.includes("no school"))
    return "holiday";
  if (
    t.includes("trip") ||
    t.includes("travel") ||
    t.includes("flight") ||
    t.includes("museum") ||
    t.includes("field trip")
  )
    return "trip";
  return "activity";
}

/** Pick a fitting emoji for the event. */
function eventIcon(type: EventType, summary: string): string {
  const s = summary.toLowerCase();
  if (type === "birthday") return "🎂";
  if (type === "holiday") return "🌟";
  if (type === "trip") {
    if (s.includes("museum")) return "🔭";
    if (s.includes("field")) return "🔬";
    return "✈️";
  }
  // activity
  if (s.includes("piano") || s.includes("recital")) return "🎹";
  if (s.includes("music") || s.includes("concert")) return "🎵";
  if (s.includes("apex") || s.includes("class") || s.includes("lesson")) return "🎒";
  if (s.includes("soccer") || s.includes("sport") || s.includes("swim")) return "⚽";
  if (s.includes("doctor") || s.includes("dentist")) return "🏥";
  return "📅";
}

function cleanText(s: string): string {
  return s.replace(/\\n/g, " ").replace(/\\,/g, ",").replace(/\\\\/g, "\\").trim();
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** Parse an iCal text string and return upcoming events within `daysAhead`. */
export function parseIcal(text: string, daysAhead = 60): CalendarEvent[] {
  // Unfold continuation lines (CRLF or LF followed by whitespace)
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const collected: { date: Date; event: CalendarEvent }[] = [];

  let inEvent = false;
  let ev: Record<string, string> = {};

  for (const raw of lines) {
    const line = raw.trim();

    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      ev = {};
      continue;
    }

    if (line === "END:VEVENT") {
      inEvent = false;
      const summary = cleanText(ev.summary ?? "");
      if (!ev.dtstart || !summary) continue;

      let date = parseDateOnly(extractDtValue(ev.dtstart));
      if (!date) continue;

      // Expand yearly recurrences into this/next year
      if (ev.rrule?.includes("FREQ=YEARLY")) {
        date = yearlyDate(date, today);
      }

      date.setHours(0, 0, 0, 0);
      if (date < today || date > cutoff) continue;

      const type = inferType(summary, ev.categories ?? "");
      collected.push({
        date,
        event: {
          date: formatDisplayDate(date),
          label: summary,
          type,
          icon: eventIcon(type, summary),
        },
      });
      continue;
    }

    if (!inEvent) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const baseKey = line.slice(0, colonIdx).split(";")[0].toUpperCase();
    const value = line.slice(colonIdx + 1);

    if (baseKey === "DTSTART")
      ev.dtstart = line; // keep full line for param extraction
    else if (baseKey === "SUMMARY") ev.summary = value;
    else if (baseKey === "CATEGORIES") ev.categories = value;
    else if (baseKey === "RRULE") ev.rrule = value;
  }

  // Sort chronologically, cap at 8
  collected.sort((a, b) => a.date.getTime() - b.date.getTime());
  return collected.slice(0, 8).map((c) => c.event);
}

/**
 * Fetches and parses an iCal feed URL.
 * Cached for 1 hour via Next.js fetch cache.
 * Returns [] on any error.
 */
export async function fetchCalendarEvents(url: string, daysAhead = 60): Promise<CalendarEvent[]> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const text = await res.text();
    return parseIcal(text, daysAhead);
  } catch {
    return [];
  }
}
