"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Divider, Icon } from "@/components/ui";
import type { Student, Task } from "@/lib/types";
import { formatTime, rgba } from "@/lib/utils";

export interface StoragePath {
  path: string;
  name: string;
  mimeType: string;
}

interface FileEntry {
  file: File;
  preview: string; // blob URL for images, "" for non-images
}

interface SubmitModalProps {
  task: Task;
  student: Student;
  onClose: () => void;
  onSubmit: (taskId: string, data: { storagePaths: StoragePath[]; text: string; timer: number }) => void;
  onCheck: (taskId: string) => void;
}

export function SubmitModal({ task, student, onClose, onSubmit, onCheck }: SubmitModalProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [text, setText] = useState("");
  const [sec, setSec] = useState(0);
  const [running, setRunning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Support both proofTypes array and legacy proofType field
  const proofTypes: string[] = task.proofTypes?.length ? task.proofTypes : [task.proofType ?? "checkbox"];
  const needsFile = proofTypes.some((pt) => pt === "photo" || pt === "file");
  const needsTimer = proofTypes.includes("timer");
  const isCheckbox = proofTypes.includes("checkbox") && !needsFile && !needsTimer;
  const acceptAttr = proofTypes.includes("photo") ? "image/*" : "*/*";

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
    const newEntries: FileEntry[] = Array.from(fileList).map((f) => ({
      file: f,
      preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : "",
    }));
    setEntries((p) => [...p, ...newEntries]);
    // reset input so same file can be re-selected
    e.target.value = "";
  };

  const removeEntry = (i: number) => {
    setEntries((p) => {
      const next = [...p];
      if (next[i].preview) URL.revokeObjectURL(next[i].preview);
      next.splice(i, 1);
      return next;
    });
  };

  const handleSubmit = async () => {
    setUploadErr("");
    setUploading(true);

    const storagePaths: StoragePath[] = [];

    if (entries.length > 0) {
      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];

      for (const entry of entries) {
        const safeName = entry.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        // Path within bucket: {student_key}/{date}/{subjectId}/{timestamp}-{filename}
        const path = `${student.id}/${today}/${task.subjectId}/${Date.now()}-${safeName}`;
        const { data, error } = await supabase.storage.from("submissions").upload(path, entry.file, {
          contentType: entry.file.type || "application/octet-stream",
          upsert: false,
        });
        if (error) {
          setUploadErr(`Upload failed: ${error.message}`);
          setUploading(false);
          return;
        }
        storagePaths.push({ path: data.path, name: entry.file.name, mimeType: entry.file.type || "application/octet-stream" });
      }
    }

    setUploading(false);
    onSubmit(task.id, { storagePaths, text, timer: sec });
  };

  const fileExt = (name: string) => name.split(".").pop()?.toUpperCase() ?? "FILE";

  return (
    <div className="modal-bg" onClick={onClose} onKeyDown={() => {}}>
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
        role="dialog"
        className="glass-warm"
        style={{ width: "100%", maxWidth: 460, padding: 24, borderColor: rgba(student.color, 0.45) }}
      >
        {/* Header */}
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

        {/* Assignment detail */}
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

        {/* File / photo upload */}
        {needsFile && (
          <div style={{ marginTop: 12 }}>
            <label className="upload-zone" style={{ display: "block", cursor: "pointer" }}>
              <Icon name="submit" size={32} style={{ margin: "0 auto 6px" }} />
              <div style={{ fontSize: 12 }}>
                {proofTypes.includes("photo") ? "Tap to add photos — multiple pages OK" : "Tap to attach a file (photo, PDF, doc, audio…)"}
              </div>
              <input type="file" accept={acceptAttr} multiple onChange={addFiles} style={{ display: "none" }} />
            </label>

            {entries.length > 0 && (
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 8 }}>
                {entries.map((entry, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: file list with index
                  <div key={`${entry.file.name}-${i}`} style={{ position: "relative" }}>
                    {entry.preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.preview}
                        alt=""
                        style={{
                          width: 56,
                          height: 56,
                          objectFit: "cover",
                          borderRadius: 5,
                          border: `1px solid ${rgba(task.subjectColor, 0.45)}`,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 5,
                          border: `1px solid ${rgba(task.subjectColor, 0.45)}`,
                          background: "rgba(0,0,0,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          color: "#7A8B9C",
                          textAlign: "center",
                          padding: 4,
                        }}
                      >
                        {fileExt(entry.file.name)}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeEntry(i)}
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
                {/* Add more button */}
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
                  <input type="file" accept={acceptAttr} multiple onChange={addFiles} style={{ display: "none" }} />
                </label>
              </div>
            )}
          </div>
        )}

        {/* Timer */}
        {needsTimer && (
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

        {/* Notes */}
        <textarea
          className="inp"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Notes or questions for your parent..."
          style={{ marginTop: 10, minHeight: 55, fontSize: 12 }}
        />

        {uploadErr && (
          <div style={{ color: "#F08080", fontSize: 12, marginTop: 6 }}>{uploadErr}</div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 9, marginTop: 12 }}>
          {isCheckbox ? (
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
              onClick={handleSubmit}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "Submit for Review"}
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
