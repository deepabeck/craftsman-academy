function gradeColor(pct: number): string {
  if (pct >= 80) return "#70E090";
  if (pct >= 70) return "#D4A830";
  return "#F08080";
}

interface GradeCardsProps {
  /** Original AI score. Null when it was not preserved or should not be shown. */
  aiScore: number | null;
  aiFeedback: string | null;
  /** Shown under the AI card when the original score could not be kept. */
  aiNote?: string | null;
  /** Parent's grade. Null while still waiting on review. */
  finalScore: number | null;
  parentNote: string | null;
  /** "YOUR PARENT" for students, "YOUR GRADE" for the parent view. */
  parentLabel: string;
}

function Card({
  accent,
  label,
  score,
  body,
  muted,
  footnote,
}: {
  accent: string;
  label: string;
  score: number | null;
  body: string;
  muted?: boolean;
  footnote?: string | null;
}) {
  return (
    <div
      style={{
        borderRadius: 10,
        padding: "12px 14px",
        background: "rgba(0,0,0,0.38)",
        border: `1px solid ${accent}55`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: accent }}>{label}</span>
        {score !== null && (
          <span style={{ fontSize: 20, fontWeight: 700, color: gradeColor(score) }}>{Math.round(score)}%</span>
        )}
      </div>
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.55,
          color: muted ? "#8A9BB2" : "#B8C6D6",
          fontStyle: muted ? "italic" : "normal",
        }}
      >
        {body}
      </div>
      {footnote && <div style={{ fontSize: 11, color: "#6A7B8C", marginTop: 6 }}>{footnote}</div>}
    </div>
  );
}

/** Side-by-side AI first pass and parent final grade, shared by the parent and student journal views. */
export function GradeCards({ aiScore, aiFeedback, aiNote, finalScore, parentNote, parentLabel }: GradeCardsProps) {
  const hasAi = aiScore !== null || !!aiFeedback;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
      {hasAi && (
        <Card
          accent="#9BA4F0"
          label={aiScore !== null ? "FIRST-PASS AI SCORE" : "AI COMMENTS"}
          score={aiScore}
          body={aiFeedback || "No AI comments."}
          muted={!aiFeedback}
          footnote={aiNote}
        />
      )}
      {!hasAi && (
        <Card accent="#9BA4F0" label="AI SCORE" score={null} body="No AI score was recorded for this entry." muted />
      )}
      <Card
        accent="#E8A820"
        label={`FINAL GRADE · ${parentLabel}`}
        score={finalScore}
        body={parentNote ?? (finalScore === null ? "Not graded yet." : "No comment added.")}
        muted={!parentNote}
      />
    </div>
  );
}
