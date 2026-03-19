"use client";

import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ height: "100vh", display: "flex", overflow: "hidden" }}>
      <AdminSidebar />
      <div className="main-scroll">
        <div className="content-wrap">{children}</div>
      </div>
    </div>
  );
}
