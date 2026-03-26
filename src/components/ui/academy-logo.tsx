import { Icon } from "./icon";

const SCHOOL_NAME = process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "Craftsman Academy";
// Split into two display lines: first word(s) on top, last word on bottom
const nameParts = SCHOOL_NAME.trim().split(/\s+/);
const SCHOOL_LINE1 = nameParts.slice(0, -1).join(" ").toUpperCase() || SCHOOL_NAME.toUpperCase();
const SCHOOL_LINE2 = nameParts.length > 1 ? nameParts[nameParts.length - 1].toUpperCase() : "";

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
          {SCHOOL_LINE1}
        </div>
        {SCHOOL_LINE2 && (
          <div className="cinzel text-dim" style={{ fontSize: size * 0.24, letterSpacing: "0.2em", lineHeight: 1 }}>
            {SCHOOL_LINE2}
          </div>
        )}
      </div>
    </div>
  );
}
