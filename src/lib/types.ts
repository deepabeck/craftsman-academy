export interface Student {
  id: string;
  name: string;
  color: string;
  avatar: string;
  grade: string;
  tagline: string;
  subjects: Subject[];
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  days: string[];
  only: string | null;
  detail: string;
}

export interface Task {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectIcon: string;
  subjectColor: string;
  detail: string;
  proofType: "photo" | "timer" | "checkbox";
  duration: number;
  status: "pending" | "done" | "review" | "missed" | "approved";
  notes: string;
  files: FileEntry[];
  completedAt: string | null;
}

export interface FileEntry {
  name: string;
  url: string;
}

export interface Review {
  id: string;
  studentId: string;
  studentName: string;
  subjectName: string;
  date: string;
  files: string[];
  status: "pending" | "approved" | "needs-revision";
  score: number | null;
}

export interface AiNote {
  summary: string;
  tags: AiTag[];
  parentNote: string;
}

export interface AiTag {
  l: string;
  t: "auto" | "alert" | "manual";
}

export interface MockWeather {
  temp: number;
  condition: string;
  high: number;
  low: number;
  icon: string;
  hourly: { t: string; icon: string; temp: number }[];
}

export interface CalendarEvent {
  date: string;
  label: string;
  type: "holiday" | "activity" | "trip" | "birthday";
  icon: string;
}

export type UserRole = "admin" | "student";
export type AdminPage = "dashboard" | "subjects" | "schedule" | "review" | "profiles";
export type StudentPage = "today" | "week" | "progress" | "history" | "customize";
export type TaskStatus = "pending" | "done" | "review" | "missed" | "approved";
