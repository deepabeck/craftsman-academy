"use client";

import { useEffect, useRef, useState } from "react";
import { Divider, Icon } from "@/components/ui";
import type { Student, Task } from "@/lib/types";
import { formatTime, rgba } from "@/lib/utils";

interface SubmitModalProps {
  task: Task;
  student: Student;
  onClose: () => void;
  onSubmit: (taskId: string, data: { files: { name: string; url: string }[]; text: string; timer: number }) => void;
  onCheck: (taskId: string) => void;
}

export function SubmitModal({ task, student, onClose, onSubmit, onCheck }: SubmitModalProps) {
  const [files, setFiles] = useState<{ name: string; url: string }[]>([]);
  const [text, setText] = useState("");
  const [sec, setSec] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSec((s) => s + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    setFiles((p) => [...p, ...Array.from(fileList).map((f) => ({ name: f.name, url: URL.createObjectURL(f) }))]);
  };

  return (
    <div className="modal-bg" onClick={onClose} onKeyDown={() => {}}>
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
        role="dialog"
        className="glass-warm"
        style={{ width: "100%", maxWidth: 460, padding: 24, borderColor: rgba(student.color, 0.45) }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Icon name={task.subjectIcon} size={48} />
          <div style={{ flex: 1 }}>
            <div className="cinzel brass" style={{ fontSize: 16, fontWeight: 700 }}>
              Submit Work
            </div>
            <div className="text-mid" style={{ fontSize: 12, marginTop: 2 }}>
              {task.subjectName}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#506070", fontSize: 20 }}
          >
            &times;
          </button>
        </div>
        <Divider />
        <div
          style={{
            fontSize: 12,
            color: "#9AABBC",
            lineHeight: 1.6,
            borderRadius: 7,
            background: "rgba(0,0,0,0.2)",
            padding: "10px 12px",
            margin: "10px 0",
            borderLeft: `3px solid ${rgba(task.subjectColor, 0.6)}`,
          }}
        >
          {task.detail}
        </div>

        {task.proofType === "photo" && (
          <div style={{ marginTop: 12 }}>
            <label className="upload-zone" style={{ display: "block", cursor: "pointer" }}>
              <Icon name="submit" size={32} style={{ margin: "0 auto 6px" }} />
              <div style={{ fontSize: 12 }}>Tap to add photos — multiple pages OK</div>
              <input type="file" accept="image/*" multiple onChange={addFiles} style={{ display: "none" }} />
            </label>
            {files.length > 0 && (
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 8 }}>
                {files.map((f, i) => (
                  <div key={f.name} style={{ position: "relative" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.url}
                      alt=""
                      style={{
                        width: 56,
                        height: 56,
                        objectFit: "cover",
                        borderRadius: 5,
                        border: `1px solid ${rgba(task.subjectColor, 0.45)}`,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                      style={{
                        position: "absolute",
                        top: -4,
                        right: -4,
                        width: 15,
                        height: 15,
                        background: "#C03030",
                        border: "none",
                        borderRadius: "50%",
                        cursor: "pointer",
                        color: "white",
                        fontSize: 9,
                        lineHeight: "15px",
                        textAlign: "center",
                      }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
                <label
                  className="upload-zone"
                  style={{
                    width: 56,
                    height: 56,
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 5,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 20, color: "#C8860A" }}>+</span>
                  <input type="file" accept="image/*" multiple onChange={addFiles} style={{ display: "none" }} />
                </label>
              </div>
            )}
          </div>
        )}

        {task.proofType === "timer" && (
          <div style={{ textAlign: "center", padding: "14px 0" }}>
            <div
              style={{
                fontSize: 48,
                fontFamily: "monospace",
                color: "#E8A820",
                letterSpacing: "0.12em",
                marginBottom: 12,
              }}
            >
              {formatTime(sec)}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 8 }}>
              <button type="button" className="btn-brass" onClick={() => setRunning(!running)}>
                {running ? "⏸ Pause" : "▶ Start"}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setSec(0);
                  setRunning(false);
                }}
              >
                ↺ Reset
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#506070" }}>
              Goal: {task.duration} min &middot;{" "}
              {sec >= task.duration * 60
                ? "✓ Complete!"
                : `${Math.max(0, task.duration - Math.floor(sec / 60))} min remaining`}
            </div>
          </div>
        )}

        <textarea
          className="inp"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Notes or questions for your parent..."
          style={{ marginTop: 10, minHeight: 55, fontSize: 12 }}
        />
        <div style={{ display: "flex", gap: 9, marginTop: 12 }}>
          {task.proofType === "checkbox" ? (
            <button
              type="button"
              className="btn-brass"
              style={{ flex: 1, padding: "11px" }}
              onClick={() => {
                onCheck(task.id);
                onClose();
              }}
            >
              ✓ Mark Done
            </button>
          ) : (
            <button
              type="button"
              className="btn-brass"
              style={{ flex: 1, padding: "11px" }}
              onClick={() => onSubmit(task.id, { files, text, timer: sec })}
            >
              Submit for Review
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
