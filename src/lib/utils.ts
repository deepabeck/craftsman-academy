/**
 * Convert a hex color string to RGB components.
 * Falls back to a dark navy (#1A3A5C) if the input is invalid.
 */
export function hexToRgb(h: string | undefined): { r: number; g: number; b: number } {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h || "#1A3A5C");
  return m
    ? { r: Number.parseInt(m[1], 16), g: Number.parseInt(m[2], 16), b: Number.parseInt(m[3], 16) }
    : { r: 26, g: 58, b: 92 };
}

/**
 * Create an rgba() CSS string from a hex color and alpha value.
 * Used extensively for dynamic student/subject color styling.
 */
export function rgba(hex: string | undefined, a: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Format seconds into MM:SS display string.
 */
export function formatTime(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Get the current day-of-week abbreviation (e.g., "Mon", "Tue").
 */
export function getTodayDow(): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
}

/**
 * Get a formatted date label (e.g., "Monday, March 17").
 */
export function getTodayLabel(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/**
 * Convert a numeric grade (1–12) to an ordinal label like "4th Grade".
 * Returns "—" if grade is null.
 */
export function gradeLabel(grade: number | null): string {
  if (grade === null) return "—";
  // 11, 12, 13 are exceptions to the last-digit rule
  let suffix: string;
  if (grade === 11 || grade === 12 || grade === 13) {
    suffix = "th";
  } else {
    const last = grade % 10;
    suffix = last === 1 ? "st" : last === 2 ? "nd" : last === 3 ? "rd" : "th";
  }
  return `${grade}${suffix} Grade`;
}
