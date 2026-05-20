"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Divider, Icon, PortraitFrame } from "@/components/ui";
import { useAuth } from "@/providers/auth-provider";

const NAV_ITEMS = [
  { id: "dashboard", path: "/admin/dashboard", label: "Command Center", icon: "command-center" },
  { id: "subjects", path: "/admin/subjects", label: "Subjects", icon: "subjects" },
  { id: "schedule", path: "/admin/lessons", label: "Schedule", icon: "schedule" },
  { id: "review", path: "/admin/review", label: "Review Queue", icon: "review" },
  { id: "shop", path: "/admin/shop", label: "Shop", icon: "coin" },
  { id: "submissions", path: "/admin/submissions", label: "Submissions", icon: "history" },
  { id: "profiles", path: "/admin/profiles", label: "Profiles", icon: "profile" },
];

const SCHOOL_NAME = process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "Craftsman Academy";

export function AdminSidebar() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        <div style={{ marginBottom: -12 }}>
          <PortraitFrame src={user?.avatarUrl ?? "/assets/icon-profile.png"} name={user?.name ?? "Admin"} />
        </div>
        <div style={{ padding: "4px 14px 6px", flexShrink: 0 }}>
          <div
            className="cinzel"
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#C8860A",
              letterSpacing: "0.07em",
              textShadow: "0 1px 8px rgba(0,0,0,0.95)",
            }}
          >
            {user?.name ?? "Admin"}
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#C8B080",
              marginTop: 2,
              fontStyle: "italic",
              textShadow: "0 1px 5px rgba(0,0,0,0.9)",
            }}
          >
            {user?.tagline ?? ""}
          </div>
        </div>
        {/* Compact academy logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px 5px", flexShrink: 0 }}>
          <Icon name="logo" size={22} />
          <div className="cinzel" style={{ fontSize: 13, color: "#506070", letterSpacing: "0.2em" }}>
            {SCHOOL_NAME.toUpperCase()}
          </div>
        </div>
        <Divider />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, paddingTop: 4, overflowY: "auto" }}>
          {NAV_ITEMS.map((n) => (
            <Link
              key={n.id}
              href={n.path}
              className={`nav-item${pathname === n.path ? " active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              <Icon name={n.icon} size={42} />
              <span>{n.label}</span>
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
