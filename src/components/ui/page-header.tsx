import { Icon } from "./icon";

interface PageHeaderProps {
  icon: string;
  title: string;
  sub: string;
  color?: string;
}

export function PageHeader({ icon, title, sub }: PageHeaderProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
      <Icon name={icon} size={62} />
      <div className="metal-wrap">
        <div
          className="cinzel metal-text"
          style={{ fontSize: 30, fontWeight: 900, letterSpacing: "0.05em", lineHeight: 1.1 }}
        >
          {title}
        </div>
        <div style={{ fontSize: 14, color: "#A09070", marginTop: 6, letterSpacing: "0.04em" }}>{sub}</div>
      </div>
    </div>
  );
}
