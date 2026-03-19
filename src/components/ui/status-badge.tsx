import type { TaskStatus } from "@/lib/types";

const BADGE_CLASS: Record<string, string> = {
  done: "badge-done",
  pending: "badge-pending",
  review: "badge-review",
  missed: "badge-missed",
  approved: "badge-approved",
};

const BADGE_LABEL: Record<string, string> = {
  done: "Done",
  pending: "Pending",
  review: "Review",
  missed: "Missed",
  approved: "Approved",
};

interface StatusBadgeProps {
  status: TaskStatus | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`badge ${BADGE_CLASS[status] || "badge-pending"}`}>{BADGE_LABEL[status] || status}</span>;
}
