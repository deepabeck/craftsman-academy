import Image from "next/image";
import { ICON_MAP } from "@/lib/constants";

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 32, className, style }: IconProps) {
  const src = ICON_MAP[name] || ICON_MAP.subjects;
  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      className={`object-contain shrink-0 ${className ?? ""}`}
      style={style}
      unoptimized
    />
  );
}
