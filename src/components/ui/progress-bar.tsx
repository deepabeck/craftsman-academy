interface ProgBarProps {
  value: number;
  color: string;
  style?: React.CSSProperties;
}

export function ProgBar({ value, color, style }: ProgBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  return (
    <div className="prog-track" style={style}>
      <div
        className="prog-fill"
        style={{
          width: `${clampedValue}%`,
          background: `linear-gradient(90deg, ${color}99, ${color})`,
        }}
      />
    </div>
  );
}
