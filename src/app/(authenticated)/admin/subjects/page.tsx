"use client";

import { useState } from "react";
import { SubjectModal } from "@/components/modals/subject-modal";
import { Icon, PageHeader } from "@/components/ui";
import { SUBJECTS_ALL, WEEKDAYS } from "@/lib/constants";
import type { Subject } from "@/lib/types";
import { rgba } from "@/lib/utils";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>(SUBJECTS_ALL);
  const [modal, setModal] = useState<Subject | "add" | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const handleSave = (form: Subject) => {
    if (modal === "add") {
      setSubjects((p) => [...p, form]);
    } else {
      setSubjects((p) => p.map((s) => (s.id === form.id ? form : s)));
    }
    setModal(null);
  };

  const deleteSubject = (id: string) => {
    setSubjects((p) => p.filter((s) => s.id !== id));
    setConfirmDel(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}
      >
        <PageHeader icon="subjects" title="Subjects" sub={`${subjects.length} subjects in curriculum`} />
        <button
          type="button"
          className="btn-brass"
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px" }}
          onClick={() => setModal("add")}
        >
          <Icon name="add" size={20} />
          Add Subject
        </button>
      </div>
      {subjects.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "#506070" }}>
          <Icon name="subjects" size={56} style={{ margin: "0 auto 12px" }} />
          <div className="cinzel" style={{ fontSize: 14 }}>
            No subjects yet — add one to get started.
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {subjects.map((sub) => (
          <div key={sub.id} className="glass-warm" style={{ padding: "14px 18px", borderColor: rgba(sub.color, 0.3) }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <Icon name={sub.icon} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 5 }}>
                  <div className="cinzel" style={{ fontSize: 15, fontWeight: 700, color: sub.color }}>
                    {sub.name}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 10,
                      background: rgba(sub.color, 0.18),
                      color: sub.color,
                      border: `1px solid ${rgba(sub.color, 0.35)}`,
                    }}
                  >
                    {sub.only ? `${sub.only.charAt(0).toUpperCase()}${sub.only.slice(1)} only` : "Both students"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
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
                </div>
                {sub.detail ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#8A9AAA",
                      lineHeight: 1.55,
                      fontStyle: "italic",
                      padding: "7px 10px",
                      background: "rgba(0,0,0,0.25)",
                      borderRadius: 6,
                      borderLeft: `2px solid ${rgba(sub.color, 0.45)}`,
                      maxWidth: 520,
                    }}
                  >
                    {sub.detail.length > 100 ? `${sub.detail.substring(0, 100)}\u2026` : sub.detail}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: "#404858", fontStyle: "italic" }}>
                    No assignment instructions set.
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: "7px 14px", fontSize: 12 }}
                  onClick={() => setModal(sub)}
                >
                  Edit
                </button>
                {confirmDel === sub.id ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#F08080" }}>Delete?</span>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{
                        padding: "5px 10px",
                        fontSize: 11,
                        color: "#F08080",
                        borderColor: "rgba(200,60,60,0.5)",
                      }}
                      onClick={() => deleteSubject(sub.id)}
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
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <SubjectModal subject={modal === "add" ? null : modal} onSave={handleSave} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
