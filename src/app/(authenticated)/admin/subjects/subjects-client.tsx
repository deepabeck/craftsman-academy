"use client";

import { useCallback, useState, useTransition } from "react";
import { SubjectModal } from "@/components/modals/subject-modal";
import { Icon, PageHeader } from "@/components/ui";
import { WEEKDAYS } from "@/lib/constants";
import type { Subject } from "@/lib/types";
import { rgba } from "@/lib/utils";
import { deleteSubject, saveSubject, toggleSubjectActive } from "@/app/actions/subjects";

interface Props {
  initialSubjects: Subject[];
}

const PROOF_LABELS: Record<string, string> = {
  checkbox: "✓",
  photo: "📷",
  timer: "⏱",
  text: "✍",
  audio: "🎙",
  video: "🎬",
  file: "📎",
  platform_sync: "🔗",
};

export function SubjectsClient({ initialSubjects }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [modal, setModal] = useState<Subject | "add" | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const active = subjects.filter((s) => s.active !== false);
  const inactive = subjects.filter((s) => s.active === false);

  const handleSave = useCallback(
    (form: Subject) => {
      // Optimistic update
      const isNew = modal === "add";
      setSubjects((prev) =>
        isNew
          ? [...prev, { ...form, id: `new-${Date.now()}` }]
          : prev.map((s) => (s.id === form.id ? form : s)),
      );
      setModal(null);
      setError(null);

      startTransition(async () => {
        const saved = isNew ? { ...form, id: `new-${Date.now()}` } : form;
        const result = await saveSubject(saved);
        if (result.error) {
          setError(result.error);
          // Revert optimistic update
          setSubjects(initialSubjects);
        }
      });
    },
    [modal, initialSubjects],
  );

  const handleDelete = useCallback(
    (id: string) => {
      // Optimistic remove
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      setConfirmDel(null);
      setError(null);

      startTransition(async () => {
        const result = await deleteSubject(id);
        if (result.error) {
          setError(result.error);
          setSubjects(initialSubjects);
        }
      });
    },
    [initialSubjects],
  );

  const handleToggleActive = useCallback(
    (id: string, currentActive: boolean) => {
      const next = !currentActive;
      setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, active: next } : s)));
      setError(null);

      startTransition(async () => {
        const result = await toggleSubjectActive(id, next);
        if (result.error) {
          setError(result.error);
          setSubjects(initialSubjects);
        }
      });
    },
    [initialSubjects],
  );

  const renderSubject = (sub: Subject, isInactive = false) => (
    <div
      key={sub.id}
      className="glass-warm"
      style={{
        padding: "14px 18px",
        borderColor: rgba(sub.color, isInactive ? 0.12 : 0.3),
        opacity: isInactive ? 0.6 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <Icon name={sub.icon} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + badges row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
            <div className="cinzel" style={{ fontSize: 15, fontWeight: 700, color: sub.color }}>
              {sub.name}
            </div>
            {sub.category && (
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 7px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.06)",
                  color: "#7A8B9C",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {sub.category}
              </span>
            )}
            <span
              style={{
                fontSize: 10,
                padding: "2px 7px",
                borderRadius: 10,
                background: rgba(sub.color, 0.15),
                color: sub.color,
                border: `1px solid ${rgba(sub.color, 0.3)}`,
              }}
            >
              {sub.only ? `${sub.only.charAt(0).toUpperCase()}${sub.only.slice(1)} only` : "Both students"}
            </span>
          </div>

          {/* Days row */}
          <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
            {WEEKDAYS.map((d) => (
              <span
                key={d}
                style={{
                  fontSize: 10,
                  padding: "2px 7px",
                  borderRadius: 4,
                  fontWeight: 600,
                  background: sub.days.includes(d) ? rgba(sub.color, 0.22) : "rgba(0,0,0,0.28)",
                  color: sub.days.includes(d) ? sub.color : "#404858",
                  border: `1px solid ${sub.days.includes(d) ? rgba(sub.color, 0.38) : "rgba(255,255,255,0.06)"}`,
                }}
              >
                {d}
              </span>
            ))}
            {sub.duration && (
              <span style={{ fontSize: 10, color: "#506070", marginLeft: 4 }}>{sub.duration} min</span>
            )}
            {/* Proof type chips */}
            {(sub.proofTypes ?? []).map((pt) => (
              <span
                key={pt}
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "rgba(232,168,32,0.1)",
                  color: "#C8A050",
                  border: "1px solid rgba(232,168,32,0.2)",
                }}
              >
                {PROOF_LABELS[pt] ?? pt}
              </span>
            ))}
            {sub.requiresReview && (
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "rgba(176,160,240,0.12)",
                  color: "#B0A0F0",
                  border: "1px solid rgba(176,160,240,0.25)",
                }}
              >
                review
              </span>
            )}
            {sub.externalPlatform && (
              <span style={{ fontSize: 10, color: "#506070" }}>🔗 {sub.externalPlatform}</span>
            )}
          </div>

          {/* Default detail */}
          {sub.detail ? (
            <div
              style={{
                fontSize: 12,
                color: "#8A9AAA",
                lineHeight: 1.55,
                fontStyle: "italic",
                padding: "6px 10px",
                background: "rgba(0,0,0,0.25)",
                borderRadius: 6,
                borderLeft: `2px solid ${rgba(sub.color, 0.45)}`,
                maxWidth: 520,
              }}
            >
              {sub.detail.length > 120 ? `${sub.detail.slice(0, 120)}…` : sub.detail}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "#404858", fontStyle: "italic" }}>
              No default assignment instructions.
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
          {/* Active toggle */}
          <button
            type="button"
            className="btn-ghost"
            style={{
              padding: "5px 10px",
              fontSize: 11,
              color: isInactive ? "#70E090" : "#F08080",
              borderColor: isInactive ? "rgba(80,160,100,0.4)" : "rgba(200,60,60,0.35)",
            }}
            onClick={() => handleToggleActive(sub.id, sub.active !== false)}
            disabled={isPending}
          >
            {isInactive ? "Activate" : "Deactivate"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: "7px 14px", fontSize: 12 }}
            onClick={() => setModal(sub)}
            disabled={isPending}
          >
            Edit
          </button>
          {confirmDel === sub.id ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#F08080" }}>Delete?</span>
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: "5px 10px", fontSize: 11, color: "#F08080", borderColor: "rgba(200,60,60,0.5)" }}
                onClick={() => handleDelete(sub.id)}
              >
                Yes
              </button>
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: "5px 10px", fontSize: 11 }}
                onClick={() => setConfirmDel(null)}
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: "7px 14px", fontSize: 12, color: "#F08080", borderColor: "rgba(200,60,60,0.35)" }}
              onClick={() => setConfirmDel(sub.id)}
              disabled={isPending}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}
      >
        <PageHeader
          icon="subjects"
          title="Subjects"
          sub={`${active.length} active · ${inactive.length} inactive`}
        />
        <button
          type="button"
          className="btn-brass"
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px" }}
          onClick={() => setModal("add")}
          disabled={isPending}
        >
          <Icon name="add" size={20} />
          Add Subject
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: "rgba(200,60,60,0.12)",
            border: "1px solid rgba(200,60,60,0.35)",
            color: "#F08080",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Active subjects */}
      {active.length === 0 && inactive.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "#506070" }}>
          <Icon name="subjects" size={56} style={{ margin: "0 auto 12px" }} />
          <div className="cinzel" style={{ fontSize: 14 }}>
            No subjects yet — add one to get started.
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {active.map((sub) => renderSubject(sub, false))}
        </div>
      )}

      {/* Inactive subjects */}
      {inactive.length > 0 && (
        <>
          <div
            className="cinzel"
            style={{ fontSize: 11, color: "#506070", letterSpacing: "0.12em", marginTop: 8, paddingLeft: 4 }}
          >
            INACTIVE SUBJECTS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {inactive.map((sub) => renderSubject(sub, true))}
          </div>
        </>
      )}

      {modal && (
        <SubjectModal
          subject={modal === "add" ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
