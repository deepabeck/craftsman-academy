export interface Student {
  id: string;
  name: string;
  color: string;
  avatar: string;
  currentGrade: number | null;
  tagline: string;
  subjects: Subject[];
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  days: string[];
  only: string | null; // maps to only_student_key in DB
  detail: string;
  // Extended DB fields (optional for backward compat)
  active?: boolean;
  category?: string;
  proofTypes?: string[];
  requiresReview?: boolean;
  duration?: number; // duration_minutes
  externalPlatform?: string | null;
  sortOrder?: number;
}

export interface Task {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectIcon: string;
  subjectColor: string;
  detail: string;
  proofType: "photo" | "timer" | "checkbox";
  proofTypes?: string[]; // full array from DB (proof_types[0] = proofType)
  duration: number;
  scoringApproach?: string; // 'completion' | 'review_based' | 'time_based' | etc.
  requiresReview?: boolean; // if true, submission goes to 'review' not 'done'
  adminNote?: string; // per-task note from admin
  status: "pending" | "done" | "review" | "missed" | "approved" | "cancelled";
  cancelledReason?: string | null; // reason shown when status === 'cancelled'
  notes: string;
  files: FileEntry[];
  timerSeconds?: number; // elapsed timer seconds
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
  date: string; // formatted display date e.g. "Wed, Mar 25"
  isoDate: string; // YYYY-MM-DD for comparisons
  label: string;
  type: "holiday" | "activity" | "trip" | "birthday";
  icon: string;
  durationHours: number; // event length in hours (all-day = 8)
}

export type TaskStatus = "pending" | "done" | "review" | "missed" | "approved" | "cancelled";

export type UserRole = "admin" | "student";
export type AdminPage = "dashboard" | "subjects" | "schedule" | "review" | "profiles";
export type StudentPage = "today" | "week" | "progress" | "history" | "customize";
