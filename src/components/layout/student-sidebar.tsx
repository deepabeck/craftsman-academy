"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Divider, Icon, PortraitFrame } from "@/components/ui";
import { usePoints } from "@/contexts/points-context";
import type { Student } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

const NAV_ITEMS = [
  { id: "today", path: "/student/today", label: "Today's Missions", icon: "today" },
  { id: "week", path: "/student/week", label: "This Week", icon: "week" },
  { id: "journal", path: "/student/journal", label: "Writing Journal", icon: "reading-writing" },
  { id: "progress", path: "/student/progress", label: "Progress", icon: "progress" },
  { id: "history", path: "/student/history", label: "Mission Log", icon: "history" },
  { id: "customize", path: "/student/customize", label: "Customize", icon: "customize" },
];

function CoinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Coin face */}
      <circle cx="12" cy="12" r="10.5" fill="#6B4608" stroke="#E8A820" strokeWidth="1.4" />
      {/* Inner ring detail */}
      <circle cx="12" cy="12" r="8" fill="none" stroke="#C8860A" strokeWidth="0.7" strokeDasharray="2.2 1.6" />
      {/* 4-pointed star */}
      <path d="M12 6 L13.8 10.2 L18 12 L13.8 13.8 L12 18 L10.2 13.8 L6 12 L10.2 10.2 Z" fill="#E8A820" />
    </svg>
  );
}

interface StudentSidebarProps {
  student: Student;
}

export function StudentSidebar({ student }: StudentSidebarProps) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { balance: pointsBalance } = usePoints();

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        <PortraitFrame src={student.avatar} name={student.name} />
        <div style={{ padding: "4px 14px 6px", flexShrink: 0 }}>
          <div
            className="cinzel"
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: student.color,
              letterSpacing: "0.07em",
              textShadow: "0 1px 8px rgba(0,0,0,0.95)",
            }}
          >
            {student.name.toUpperCase()}
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#C8B080",
              marginTop: 2,
              fontStyle: "italic",
              textShadow: "0 1px 5px rgba(0,0,0,0.9)",
              lineHeight: 1.3,
            }}
          >
            {student.tagline}
          </div>
        </div>
        {pointsBalance !== null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 14px 2px",
            }}
          >
            <CoinIcon />
            <span
              className="cinzel"
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#E8A820",
                letterSpacing: "0.04em",
                textShadow: "0 1px 6px rgba(0,0,0,0.9)",
              }}
            >
              {pointsBalance.toLocaleString()} pts
            </span>
          </div>
        )}
        <Divider />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, paddingTop: 4, overflowY: "auto" }}>
          {NAV_ITEMS.map((t) => (
            <Link
              key={t.id}
              href={t.path}
              className={`nav-item${pathname === t.path ? " active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              <Icon name={t.icon} size={42} />
              <span>{t.label}</span>
            </Link>
          ))}
        </div>
        <Divider />
        <button
          type="button"
          className="nav-item text-dim"
          onClick={signOut}
          style={{ background: "none", border: "none", width: "100%", cursor: "pointer", textAlign: "left" }}
        >
          <Icon name="sign-out" size={36} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
