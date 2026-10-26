/**
 * Brand loading spinner: the CA mark with its sun ring turning.
 * Pure SVG (no text glyph), so it renders the same on desktop, iPhone and iPad.
 */
export function GearSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: 18,
      }}
    >
      <svg
        viewBox="92 92 840 840"
        width={96}
        height={96}
        role="img"
        aria-label="Loading"
        style={{ filter: "drop-shadow(0 0 14px rgba(232,168,32,0.35))" }}
      >
        <defs>
          <linearGradient id="ls-br" gradientUnits="userSpaceOnUse" x1="92" y1="92" x2="932" y2="932">
            <stop offset="0" stopColor="#F6D77A" />
            <stop offset=".5" stopColor="#E8A820" />
            <stop offset="1" stopColor="#B87A10" />
          </linearGradient>
          <linearGradient id="ls-ca" gradientUnits="userSpaceOnUse" x1="120" y1="130" x2="400" y2="400">
            <stop offset="0" stopColor="#F6D77A" />
            <stop offset=".5" stopColor="#E8A820" />
            <stop offset="1" stopColor="#C88A14" />
          </linearGradient>
          <clipPath id="ls-cc">
            <polygon points="-100,-100 400,-100 181,512 -100,512" />
          </clipPath>
          <clipPath id="ls-ft">
            <rect x="0" y="0" width="512" height="386" />
          </clipPath>
        </defs>
        <g className="gear-spin-svg">
          <g transform="translate(512,512)">
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(0)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(15)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(30)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(45)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(60)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(75)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(90)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(105)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(120)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(135)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(150)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(165)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(180)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(195)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(210)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(225)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(240)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(255)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(270)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(285)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(300)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(315)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(330)" />
            <rect x="-9" y="-402" width="18" height="38" rx="4" fill="url(#ls-br)" transform="rotate(345)" />
            <circle r="350" fill="none" stroke="url(#ls-br)" strokeWidth="14" />
            <circle r="318" fill="none" stroke="url(#ls-br)" strokeWidth="4" opacity=".7" />
          </g>
        </g>
        <g transform="translate(512,512) scale(1.5) translate(-256,-256)">
          <g
            fill="none"
            stroke="url(#ls-ca)"
            strokeWidth="30"
            strokeLinejoin="miter"
            strokeMiterlimit="10"
            transform="translate(11,-12)"
          >
            <g clipPath="url(#ls-cc)">
              <path d="M 284 188 A 92 92 0 1 0 268 339" />
            </g>
            <g clipPath="url(#ls-ft)">
              <path d="M 226 407 L 300 234 L 374 407" />
            </g>
            <path d="M 262 344 L 340 344" strokeWidth="24" />
          </g>
        </g>
      </svg>
      {message && (
        <div
          className="cinzel"
          style={{
            color: "#8A9BB2",
            fontSize: 12,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
