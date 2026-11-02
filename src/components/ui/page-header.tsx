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
      {/* Dark glass plate keeps the title readable over full-bleed background art. */}
      <div
        className="glass"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "10px 30px 12px 16px",
          borderRadius: 14,
          background: "linear-gradient(100deg, rgba(8,17,30,0.9) 0%, rgba(8,17,30,0.82) 70%, rgba(8,17,30,0.66) 100%)",
          border: "1px solid rgba(184,134,11,0.3)",
          boxShadow: "inset 0 1px 0 rgba(232,168,32,0.1), 0 6px 22px rgba(0,0,0,0.35)",
        }}
      >
        <Icon name={icon} size={72} />
        <div className="metal-wrap">
          <div
            className="cinzel metal-text"
            style={{ fontSize: 30, fontWeight: 700, letterSpacing: "0.05em", lineHeight: 1.1 }}
          >
            {title}
          </div>
          <div style={{ fontSize: 14, color: "#C9B98A", marginTop: 6, letterSpacing: "0.04em" }}>{sub}</div>
        </div>
      </div>
      {right && <div style={{ marginLeft: "auto", flexShrink: 0 }}>{right}</div>}
    </div>
  );
}
