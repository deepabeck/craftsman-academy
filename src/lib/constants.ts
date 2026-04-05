import type { AiNote, CalendarEvent, MockWeather, Review, Student, Subject } from "./types";

/** Icon name → image path mapping. All paths are relative to /public. */
export const ICON_MAP: Record<string, string> = {
  "command-center": "/assets/icon-command-center.png",
  subjects: "/assets/icon-subjects.png",
  schedule: "/assets/icon-schedule.png",
  review: "/assets/icon-review-queue.png",
  profile: "/assets/icon-profile.png",
  today: "/assets/icon-today.png",
  week: "/assets/icon_weekly.png",
  progress: "/assets/icon-progress.png",
  history: "/assets/icon-history.png",
  customize: "/assets/icon-customize.png",
  math: "/assets/icon-math.png",
  geography: "/assets/icon-geography.png",
  science: "/assets/icon-science.png",
  reading: "/assets/icon-reading-writing.png",
  "reading-writing": "/assets/icon-reading-writing.png",
  coding: "/assets/icon-coding.png",
  music: "/assets/icon-music-composition.png",
  piano: "/assets/icon-piano.png",
  microphone: "/assets/icon-microphone.png",
  apex: "/assets/icon-apex-homework.png",
  completed: "/assets/icon-completed.png",
  approved: "/assets/icon-approved.png",
  pending: "/assets/icon_pending-review.png",
  "active-subjects": "/assets/icon-active-subjects.png",
  "ai-obs": "/assets/icon-AI-observation.png",
  "parent-note": "/assets/icon-parent-note.png",
  submit: "/assets/icon-submit-upload.png",
  techtime: "/assets/icon-techtime-unlocked.png",
  "sign-out": "/assets/icon-sign-out.png",
  add: "/assets/icon-add.png",
  coin: "/assets/icon_coin.png",
  "todays-tasks": "/assets/icon-todays-tasks.png",
  logo: "/assets/icon_coin.png",
};

/** All subjects in the curriculum. */
export const SUBJECTS_ALL: Subject[] = [
  {
    id: "math",
    name: "Mathematics",
    icon: "math",
    color: "#C8860A",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    only: null,
    detail: "Complete pages 45\u201348 in your workbook. Show all work. Extra credit: word problems on back page.",
  },
  {
    id: "geo",
    name: "Geography",
    icon: "geography",
    color: "#6A9A60",
    days: ["Mon", "Wed", "Fri"],
    only: null,
    detail: "Read chapter 7 on South American geography. Label countries on the blank map worksheet.",
  },
  {
    id: "science",
    name: "Science",
    icon: "science",
    color: "#4A90C0",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    only: null,
    detail: "Complete the plant cell diagram. Label all 8 organelles and write one sentence about each.",
  },
  {
    id: "reading",
    name: "Reading & Writing",
    icon: "reading",
    color: "#8A60C0",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    only: null,
    detail: "Read chapters 12\u201314. Write a 3-sentence summary of the main events in your journal.",
  },
  {
    id: "coding",
    name: "Coding",
    icon: "coding",
    color: "#30A0A0",
    days: ["Mon", "Wed", "Fri"],
    only: "deven",
    detail: "Finish the Scratch project. Add at least 2 new sprites and 1 new sound effect.",
  },
  {
    id: "music",
    name: "Music Composition",
    icon: "music",
    color: "#C05070",
    days: ["Tue", "Thu"],
    only: "shaan",
    detail: "Compose 4 bars in Soundtrap using at least 3 instruments. Export and save to your folder.",
  },
  {
    id: "piano",
    name: "Piano",
    icon: "piano",
    color: "#7050C0",
    days: ["Mon", "Wed", "Fri"],
    only: "shaan",
    detail: "Practice C, G, D major scales (5 min each). Then practice measures 1\u201316 of your recital piece.",
  },
  {
    id: "apex",
    name: "APEX Homework",
    icon: "apex",
    color: "#D09040",
    days: ["Tue"],
    only: null,
    detail: "Complete the worksheet from Tuesday's APEX class. Answer all review questions.",
  },
];

/** Base student data (without subjects — subjects are derived). */
export const BASE_STUDENTS: Record<string, Omit<Student, "subjects">> = {
  deven: {
    id: "deven",
    name: "Deven",
    color: "#4A90D0",
    avatar: "/assets/profile-deven.png",
    currentGrade: null, // Derived at runtime from school_years table
    tagline: "Explorer of Systems",
  },
  shaan: {
    id: "shaan",
    name: "Shaan",
    color: "#5BAA60",
    avatar: "/assets/profile-shaan.png",
    currentGrade: null, // Derived at runtime from school_years table
    tagline: "Architect of Sound",
  },
};

/** Mock weather data for the weather widget. */
export const MOCK_WEATHER: MockWeather = {
  temp: 68,
  condition: "Partly Cloudy",
  high: 72,
  low: 54,
  icon: "\u26C5",
  hourly: [
    { t: "6am", icon: "\uD83C\uDF19", temp: 58 },
    { t: "9am", icon: "\u26C5", temp: 63 },
    { t: "12pm", icon: "\uD83C\uDF24", temp: 70 },
    { t: "3pm", icon: "\u2600\uFE0F", temp: 72 },
    { t: "6pm", icon: "\u26C5", temp: 68 },
    { t: "9pm", icon: "\uD83C\uDF19", temp: 62 },
  ],
};

/** Mock calendar events. */
export const MOCK_EVENTS: CalendarEvent[] = [
  {
    date: "Mon Mar 17",
    label: "St. Patrick's Day",
    type: "holiday",
    icon: "\uD83C\uDF40",
    isoDate: "2025-03-17",
    durationHours: 0,
    startTime: null,
  },
  {
    date: "Tue Mar 18",
    label: "APEX Program \u2014 9am",
    type: "activity",
    icon: "\uD83C\uDF92",
    isoDate: "2025-03-18",
    durationHours: 1,
    startTime: "9 AM",
  },
  {
    date: "Thu Mar 20",
    label: "Science Museum Field Trip",
    type: "trip",
    icon: "\uD83D\uDD2C",
    isoDate: "2025-03-20",
    durationHours: 3,
    startTime: null,
  },
  {
    date: "Fri Mar 21",
    label: "Grandma's Birthday",
    type: "birthday",
    icon: "\uD83C\uDF82",
    isoDate: "2025-03-21",
    durationHours: 0,
    startTime: null,
  },
  {
    date: "Mon Mar 24",
    label: "Piano Recital Rehearsal",
    type: "activity",
    icon: "\uD83C\uDFB9",
    isoDate: "2025-03-24",
    durationHours: 1,
    startTime: null,
  },
];

/** Initial AI notes per student. */
export const AI_NOTES_INIT: Record<string, AiNote> = {
  deven: {
    summary:
      "Strong momentum in Math and Coding this week. Science engagement dipped mid-week \u2014 consider a hands-on experiment to re-engage.",
    tags: [
      { l: "Strong: Math", t: "auto" },
      { l: "Strong: Coding", t: "auto" },
      { l: "Monitor: Science", t: "alert" },
      { l: "Focus Mode", t: "manual" },
    ],
    parentNote: "",
  },
  shaan: {
    summary:
      "Excellent Piano and Music Composition discipline. Reading & Writing is thoughtful but pacing is inconsistent \u2014 a writing sprint session may help.",
    tags: [
      { l: "Strong: Piano", t: "auto" },
      { l: "Strong: Music", t: "auto" },
      { l: "Pacing: Reading", t: "alert" },
    ],
    parentNote: "",
  },
};

/** Initial review queue. */
export const REVIEW_INIT: Review[] = [
  {
    id: "rv1",
    studentId: "deven",
    studentName: "Deven",
    subjectName: "Mathematics",
    date: "Mar 14",
    files: ["worksheet_p1.jpg", "worksheet_p2.jpg"],
    status: "pending",
    score: null,
  },
  {
    id: "rv2",
    studentId: "shaan",
    studentName: "Shaan",
    subjectName: "Reading & Writing",
    date: "Mar 14",
    files: ["essay_draft.jpg"],
    status: "pending",
    score: null,
  },
  {
    id: "rv3",
    studentId: "deven",
    studentName: "Deven",
    subjectName: "Coding",
    date: "Mar 13",
    files: ["code_screenshot.jpg"],
    status: "approved",
    score: 95,
  },
];

/** Preset color palette for the HexPicker. */
export const COLOR_PRESETS = [
  "#4A90D0",
  "#5BAA60",
  "#C8860A",
  "#8A60C0",
  "#D09040",
  "#4AACAC",
  "#C05070",
  "#3070C0",
  "#60A030",
  "#8040A0",
];

/** Available icon options for the subject modal. */
export const ICON_OPTIONS = [
  "math",
  "geography",
  "science",
  "reading",
  "coding",
  "music",
  "piano",
  "microphone",
  "apex",
  "subjects",
  "progress",
  "history",
  "completed",
  "ai-obs",
  "active-subjects",
  "todays-tasks",
];

/** Weekday abbreviations. */
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
