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

/** Parse a YYYYMMDD or YYYYMMDDTHHmmss[Z] string to a midnight-local Date. */
function parseDateValue(value: string): Date | null {
  const yyyymmdd = value.replace(/[TZ]/g, "").slice(0, 8);
  if (!/^\d{8}$/.test(yyyymmdd)) return null;
  const y = Number(yyyymmdd.slice(0, 4));
  const m = Number(yyyymmdd.slice(4, 6)) - 1;
  const d = Number(yyyymmdd.slice(6, 8));
  const date = new Date(y, m, d);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Extract the date-only key "YYYYMMDD" from a raw EXDATE / UNTIL line value. */
function toDateKey(value: string): string {
  return extractDtValue(value).slice(0, 8);
}

/** Generate all weekly occurrences of an event within [today, cutoff], skipping EXDATEs. */
function expandWeekly(dtstart: Date, rrule: string, exdates: string[], today: Date, cutoff: Date): Date[] {
  // Parse UNTIL from RRULE (e.g. UNTIL=20260422T190000Z)
  const untilMatch = rrule.match(/UNTIL=([^;]+)/);
  const until = untilMatch ? parseDateValue(untilMatch[1]) : null;
  const effectiveCutoff = until && until < cutoff ? until : cutoff;

  // Parse optional interval (default 1 week)
  const intervalMatch = rrule.match(/INTERVAL=(\d+)/);
  const interval = intervalMatch ? Number(intervalMatch[1]) : 1;

  // Build a set of excluded date keys
  const excluded = new Set<string>();
  for (const ex of exdates) {
    // EXDATE can be comma-separated multi-values
    for (const val of ex.split(",")) {
      excluded.add(val.slice(0, 8));
    }
  }

  const results: Date[] = [];
  const cur = new Date(dtstart);
  cur.setHours(0, 0, 0, 0);

  while (cur <= effectiveCutoff) {
    const key = `${cur.getFullYear()}${String(cur.getMonth() + 1).padStart(2, "0")}${String(cur.getDate()).padStart(2, "0")}`;
    if (cur >= today && !excluded.has(key)) {
      results.push(new Date(cur));
    }
    cur.setDate(cur.getDate() + 7 * interval);
  }
  return results;
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

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Parse HH from a dtvalue string like "20260324T150000" → 15, or null for all-day. */
function parseHour(value: string): number | null {
  const tIdx = value.indexOf("T");
  if (tIdx === -1) return null; // all-day VALUE=DATE
  return Number(value.slice(tIdx + 1, tIdx + 3));
}

/** Compute event duration in hours from raw dtstart / dtend line values. */
function computeDuration(dtstartLine: string | undefined, dtendLine: string | undefined): number {
  if (!dtendLine) return 1; // default 1 hour if no DTEND
  const startVal = dtstartLine ? extractDtValue(dtstartLine) : null;
  const endVal = extractDtValue(dtendLine);
  const startHour = startVal ? parseHour(startVal) : null;
  const endHour = parseHour(endVal);
  if (startHour === null || endHour === null) return 8; // all-day event
  const startDate = startVal ? parseDateOnly(startVal) : null;
  const endDate = parseDateOnly(endVal);
  // Multi-day
  if (startDate && endDate && endDate.getTime() > startDate.getTime() + 24 * 60 * 60 * 1000) return 8;
  const diff = endHour - startHour;
  return diff > 0 ? diff : 1;
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
  let evExdates: string[] = [];
  let evDtend: string | undefined;

  for (const raw of lines) {
    const line = raw.trim();

    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      ev = {};
      evExdates = [];
      evDtend = undefined;
      continue;
    }

    if (line === "END:VEVENT") {
      inEvent = false;
      const summary = cleanText(ev.summary ?? "");
      if (!ev.dtstart || !summary) continue;

      const baseDate = parseDateOnly(extractDtValue(ev.dtstart));
      if (!baseDate) continue;

      const type = inferType(summary, ev.categories ?? "");
      const durationHours = computeDuration(ev.dtstart, evDtend);

      const pushEvent = (d: Date) => {
        collected.push({
          date: d,
          event: {
            date: formatDisplayDate(d),
            isoDate: toIsoDate(d),
            label: summary,
            type,
            icon: eventIcon(type, summary),
            durationHours,
          },
        });
      };

      if (ev.rrule?.includes("FREQ=YEARLY")) {
        const date = yearlyDate(baseDate, today);
        date.setHours(0, 0, 0, 0);
        if (date >= today && date <= cutoff) pushEvent(date);
      } else if (ev.rrule?.includes("FREQ=WEEKLY")) {
        for (const d of expandWeekly(baseDate, ev.rrule, evExdates, today, cutoff)) {
          pushEvent(d);
        }
      } else {
        baseDate.setHours(0, 0, 0, 0);
        if (baseDate >= today && baseDate <= cutoff) pushEvent(baseDate);
      }
      continue;
    }

    if (!inEvent) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const baseKey = line.slice(0, colonIdx).split(";")[0].toUpperCase();
    const value = line.slice(colonIdx + 1);

    if (baseKey === "DTSTART")
      ev.dtstart = line; // keep full line for param extraction
    else if (baseKey === "DTEND") evDtend = line;
    else if (baseKey === "SUMMARY") ev.summary = value;
    else if (baseKey === "CATEGORIES") ev.categories = value;
    else if (baseKey === "RRULE") ev.rrule = value;
    else if (baseKey === "EXDATE") evExdates.push(toDateKey(line));
  }

  // Sort chronologically, cap at 5
  collected.sort((a, b) => a.date.getTime() - b.date.getTime());
  return collected.slice(0, 5).map((c) => c.event);
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
