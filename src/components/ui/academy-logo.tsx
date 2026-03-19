import { Icon } from "./icon";

interface AcademyLogoProps {
  size?: number;
}

export function AcademyLogo({ size = 32 }: AcademyLogoProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 14px 10px" }}>
      <Icon name="logo" size={size} />
      <div>
        <div
          className="cinzel brass"
          style={{
            fontSize: size * 0.41,
            fontWeight: 700,
            letterSpacing: "0.07em",
            lineHeight: 1.1,
            textShadow: "0 0 18px rgba(232,168,32,0.45)",
          }}
        >
          CRAFTSMAN
        </div>
        <div className="cinzel text-dim" style={{ fontSize: size * 0.24, letterSpacing: "0.2em", lineHeight: 1 }}>
          ACADEMY
        </div>
      </div>
    </div>
  );
}
