import type { ReactNode } from "react";
import { Icon } from "./icon";

interface PageHeaderProps {
  icon: string;
  title: string;
  sub: string;
  color?: string;
  /** Optional widget pinned to the right end of the header (e.g. a streak badge). */
  right?: ReactNode;
}

export function PageHeader({ icon, title, sub, right }: PageHeaderProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 14 }}>
      <Icon name={icon} size={84} />
      <div className="metal-wrap">
        <div
          className="cinzel metal-text"
          style={{ fontSize: 30, fontWeight: 700, letterSpacing: "0.05em", lineHeight: 1.1 }}
        >
          {title}
        </div>
        <div style={{ fontSize: 14, color: "#A09070", marginTop: 6, letterSpacing: "0.04em" }}>{sub}</div>
      </div>
      {right && <div style={{ marginLeft: "auto", flexShrink: 0 }}>{right}</div>}
    </div>
  );
}
