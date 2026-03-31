"use client";

import Image from "next/image";
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

interface StudentSidebarProps {
  student: Student;
}

export function StudentSidebar({ student }: StudentSidebarProps) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { balance: pointsBalance, unseenCount } = usePoints();

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        <div style={{ marginBottom: -12 }}>
          <PortraitFrame src={student.avatar} name={student.name} />
        </div>
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
          <div style={{ margin: "4px 12px 4px 28px", position: "relative" }}>
            {/* Coin overlapping the left border, centred vertically — same pattern as task cards */}
            <Link
              href="/student/shop"
              style={{
                textDecoration: "none",
                position: "absolute",
                left: -20,
                top: "50%",
                transform: "translateY(-50%)",
                display: "block",
                zIndex: 4,
              }}
            >
              <div style={{ position: "relative" }}>
                <Image
                  src="/assets/icon_coin.png"
                  alt="cogs"
                  width={56}
                  height={56}
                  style={{
                    display: "block",
                    filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.8)) drop-shadow(0 0 12px rgba(232,168,32,0.55))",
                  }}
                />
                {unseenCount > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      background: "#F08080",
                      color: "#fff",
                      borderRadius: "50%",
                      width: 16,
                      height: 16,
                      fontSize: 10,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(0,0,0,0.5)",
                    }}
                  >
                    {unseenCount > 9 ? "9+" : unseenCount}
                  </div>
                )}
              </div>
            </Link>
            <div
              style={{
                padding: "8px 14px 8px 40px",
                display: "flex",
                alignItems: "center",
                background: "rgba(232,168,32,0.07)",
                border: "1px solid rgba(232,168,32,0.35)",
                borderRadius: 10,
                boxShadow: "0 0 18px rgba(232,168,32,0.08) inset, 0 2px 8px rgba(0,0,0,0.4)",
              }}
            >
              {/* Single centered row: balance · Cogs · Shop → */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <span
                  className="cinzel"
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#E8A820",
                    letterSpacing: "0.02em",
                    lineHeight: 1,
                    textShadow: "0 0 14px rgba(232,168,32,0.6), 0 1px 4px rgba(0,0,0,0.9)",
                  }}
                >
                  {pointsBalance.toLocaleString()}
                </span>
                <span
                  className="cinzel"
                  style={{
                    fontSize: 13,
                    color: "#C8860A",
                    letterSpacing: "0.08em",
                    lineHeight: 1,
                    textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                  }}
                >
                  Cogs
                </span>
                <span style={{ color: "rgba(232,168,32,0.3)", fontSize: 10 }}>|</span>
                <Link
                  href="/student/shop"
                  className="cinzel"
                  style={{
                    fontSize: 11,
                    color: "#E8A820",
                    textDecoration: "none",
                    letterSpacing: "0.08em",
                    lineHeight: 1,
                    opacity: 0.85,
                  }}
                >
                  Shop
                </Link>
              </div>
            </div>
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
