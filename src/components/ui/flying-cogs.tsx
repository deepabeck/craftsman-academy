"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface FlyingCogsProps {
  points: number;
  label?: string;
  onDone: () => void;
}

const COINS = [
  { x: 0, rotate: 0, delay: 0 },
  { x: -60, rotate: -25, delay: 60 },
  { x: 60, rotate: 25, delay: 60 },
  { x: -110, rotate: -45, delay: 120 },
  { x: 110, rotate: 45, delay: 120 },
  { x: -30, rotate: 15, delay: 180 },
  { x: 30, rotate: -15, delay: 180 },
];

export function FlyingCogs({ points, label, onDone }: FlyingCogsProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 1400);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {/* Points label */}
      <div
        style={{
          position: "absolute",
          top: "42%",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10000,
          animation: "cogsLabelUp 1.4s ease-out forwards",
        }}
      >
        <div
          className="cinzel"
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#E8A820",
            textShadow: "0 0 20px rgba(232,168,32,0.9), 0 2px 8px rgba(0,0,0,0.9)",
            letterSpacing: "0.05em",
            whiteSpace: "nowrap",
          }}
        >
          +{points} {label ?? "Cogs"}
        </div>
      </div>

      {/* Flying coins */}
      {COINS.map((c, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static animation array
          key={i}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            marginTop: -28,
            marginLeft: -28,
            animation: `cogsFly 1.4s ease-out ${c.delay}ms forwards`,
            // biome-ignore lint/suspicious/noExplicitAny: CSS custom props
            ["--tx" as any]: `${c.x}px`,
            // biome-ignore lint/suspicious/noExplicitAny: CSS custom props
            ["--rot" as any]: `${c.rotate}deg`,
          }}
        >
          <Image
            src="/assets/icon_coin.png"
            alt=""
            width={56}
            height={56}
            style={{
              filter: "drop-shadow(0 4px 10px rgba(232,168,32,0.7)) drop-shadow(0 0 8px rgba(0,0,0,0.8))",
            }}
          />
        </div>
      ))}

      <style>{`
        @keyframes cogsFly {
          0%   { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1); }
          60%  { opacity: 1; transform: translate(var(--tx), -130px) rotate(var(--rot)) scale(1.1); }
          100% { opacity: 0; transform: translate(calc(var(--tx) * 1.4), -220px) rotate(calc(var(--rot) * 2)) scale(0.4); }
        }
        @keyframes cogsLabelUp {
          0%   { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.7); }
          20%  { opacity: 1; transform: translateX(-50%) translateY(0px) scale(1.15); }
          60%  { opacity: 1; transform: translateX(-50%) translateY(-10px) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-40px) scale(0.9); }
        }
      `}</style>
    </div>
  );
}
