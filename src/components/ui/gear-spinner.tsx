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
      <div
        className="gear-spin"
        style={{
          fontSize: 64,
          color: "#E8A820",
          textShadow: "0 0 24px rgba(232,168,32,0.45)",
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        ⚙
      </div>
      {message && (
        <div
          className="cinzel"
          style={{
            color: "#506070",
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
