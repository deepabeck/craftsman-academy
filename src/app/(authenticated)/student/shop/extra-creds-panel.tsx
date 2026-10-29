"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ExtraCredsBoard, ExtraCredsTask, TaskState } from "@/app/actions/extra-creds";
import { submitExtraCredsClaim } from "@/app/actions/extra-creds";
import { Icon } from "@/components/ui";
import { computeSplit } from "@/lib/extra-creds";
import { createClient } from "@/lib/supabase/client";

const REPEAT_NOTE: Record<ExtraCredsTask["repeatRule"], string> = {
  once: "One time",
  daily: "Once a day",
  weekly: "Once a week",
  unlimited: "Any time",
};

function PhotoPicker({ label, file, onPick }: { label: string; file: File | null; onPick: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          onPick(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        style={{
          width: "100%",
          aspectRatio: "4 / 3",
          borderRadius: 8,
          cursor: "pointer",
          border: preview ? "1px solid rgba(232,168,32,0.5)" : "1px dashed rgba(255,255,255,0.25)",
          background: preview ? `center / cover no-repeat url(${preview})` : "rgba(255,255,255,0.04)",
          color: "#C9D5E4",
          fontSize: 12,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
        }}
      >
        {!preview && (
          <>
            <span style={{ fontSize: 22 }}>📷</span>
            <span style={{ fontWeight: 700, letterSpacing: "0.12em" }}>{label}</span>
            <span style={{ fontSize: 11, color: "#7F8FA3" }}>Tap to add photo</span>
          </>
        )}
      </button>
      {preview && (
        <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "#8A9BB2", marginTop: 4, textAlign: "center" }}>
          {label} · tap to retake
        </div>
      )}
    </div>
  );
}

function JobCard({
  task,
  state,
  withNames,
  board,
  onSubmitted,
}: {
  task: ExtraCredsTask;
  state: TaskState;
  withNames: string[];
  board: ExtraCredsBoard;
  onSubmitted: (taskId: string, withNames: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [before, setBefore] = useState<File | null>(null);
  const [after, setAfter] = useState<File | null>(null);
  const [helpers, setHelpers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const team = [board.me.id, ...helpers];
  const split = computeSplit(task.reward, team, board.me.id);
  const myShare = split[board.me.id] ?? 0;

  const toggle = (id: string) => setHelpers((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));

  const upload = async (file: File, kind: "before" | "after") => {
    const supabase = createClient();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${board.studentKey}/extra-creds/${task.id}/${Date.now()}-${kind}-${safe}`;
    const { data, error } = await supabase.storage.from("submissions").upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return data.path;
  };

  const submit = async () => {
    if (!before || !after) {
      setErr("Add both a before and an after photo");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const [beforePath, afterPath] = await Promise.all([upload(before, "before"), upload(after, "after")]);
      const res = await submitExtraCredsClaim({ taskId: task.id, beforePath, afterPath, withIds: helpers });
      if (!res.success) {
        setErr(res.error ?? "Could not submit");
        setBusy(false);
        return;
      }
      onSubmitted(
        task.id,
        board.siblings.filter((s) => helpers.includes(s.id)).map((s) => s.name),
      );
      setOpen(false);
      setBefore(null);
      setAfter(null);
      setHelpers([]);
    } catch (e) {
      setErr(e instanceof Error ? `Upload failed: ${e.message}` : "Upload failed");
    }
    setBusy(false);
  };

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.65)",
        border: `1px solid ${state === "pending" ? "rgba(212,168,48,0.35)" : state === "done" ? "rgba(112,224,144,0.3)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 10,
        padding: "16px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        opacity: state === "done" ? 0.75 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <Icon name={task.icon} size={38} />
        <span
          style={{
            fontSize: 10,
            background: "rgba(255,255,255,0.06)",
            color: "#9FB0C6",
            padding: "3px 8px",
            borderRadius: 4,
            fontWeight: 600,
            letterSpacing: "0.05em",
          }}
        >
          {task.shareable ? "🤝 Can share · " : "Solo · "}
          {REPEAT_NOTE[task.repeatRule]}
        </span>
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#EEE4CC" }}>{task.title}</div>
        {task.description && (
          <div style={{ fontSize: 12, color: "#7A8B9C", marginTop: 3, lineHeight: 1.4 }}>{task.description}</div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <Image src="/assets/icon_creds.png" alt="" width={14} height={14} />
        <span className="cinzel" style={{ fontSize: 14, fontWeight: 700, color: "#E8A820" }}>
          {task.reward.toLocaleString()}
        </span>
        <span className="cinzel" style={{ fontSize: 10, color: "#C8860A", letterSpacing: "0.15em" }}>
          Creds
        </span>
        {task.shareable && <span style={{ fontSize: 10, color: "#506070", marginLeft: 2 }}>(split if shared)</span>}
      </div>

      {state === "done" && <div style={{ fontSize: 12, color: "#70E090", fontWeight: 600 }}>✓ Done for now</div>}
      {state === "pending" && (
        <div style={{ fontSize: 12, color: "#D4A830" }}>
          ⏳ Waiting for approval{withNames.length > 0 ? ` · with ${withNames.join(", ")}` : ""}
        </div>
      )}

      {state === "available" && !open && (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            padding: "8px 10px",
            borderRadius: 8,
            background: "rgba(232,168,32,0.14)",
            border: "1px solid rgba(232,168,32,0.5)",
            color: "#F2D58A",
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>📷</span>
          <span>
            <strong>Take a BEFORE photo first!</strong> Then do the job, then take an AFTER photo. You need both to get
            your Creds.
          </span>
        </div>
      )}

      {state === "available" &&
        (open ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <PhotoPicker label="BEFORE" file={before} onPick={setBefore} />
              <PhotoPicker label="AFTER" file={after} onPick={setAfter} />
            </div>

            {task.shareable && board.siblings.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 11, color: "#8A9BB2" }}>Did anyone help you?</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {board.siblings.map((s) => {
                    const on = helpers.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggle(s.id)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          color: on ? "#0B1626" : s.color,
                          background: on ? s.color : "transparent",
                          border: `1px solid ${s.color}`,
                        }}
                      >
                        {on ? "✓ " : ""}
                        {s.name}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, color: "#7A8B9C" }}>
                  {helpers.length === 0
                    ? "Doing it on your own — you get the full amount."
                    : `Shared with ${helpers.length} — you'd each get about ${myShare}.`}
                </div>
              </div>
            )}

            {err && <div style={{ fontSize: 12, color: "#F08080" }}>{err}</div>}
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: 12, padding: "6px 12px" }}
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-brass"
                style={{ fontSize: 12, padding: "6px 16px", flex: 1 }}
                disabled={busy}
                onClick={submit}
              >
                {busy ? "Sending…" : "Send for approval"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn-brass"
            style={{ fontSize: 12, padding: "7px 16px", width: "100%", marginTop: 4 }}
            onClick={() => setOpen(true)}
          >
            I did it
          </button>
        ))}
    </div>
  );
}

export function ExtraCredsPanel({ board }: { board: ExtraCredsBoard }) {
  const [tasks, setTasks] = useState(board.tasks);

  const handleSubmitted = (taskId: string, withNames: string[]) =>
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, state: "pending", withNames } : t)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {tasks.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(8, 17, 30, 0.88)",
            border: "1px solid rgba(232,168,32,0.5)",
            color: "#F2D58A",
            fontSize: 13,
            maxWidth: 640,
          }}
        >
          <span style={{ fontSize: 22 }}>📷</span>
          <span>
            <strong>Every job needs two photos.</strong> Take the BEFORE photo before you start, and the AFTER photo
            when you finish. No before photo means no Creds, so snap it first!
          </span>
        </div>
      )}

      {tasks.length === 0 ? (
        <div style={{ textAlign: "center", padding: 50, color: "#506070" }}>
          No Extra Creds jobs right now. Check back soon!
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {tasks.map((t) => (
            <JobCard
              key={t.id}
              task={t}
              state={t.state}
              withNames={t.withNames}
              board={board}
              onSubmitted={handleSubmitted}
            />
          ))}
        </div>
      )}

      {board.recent.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 560 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "#8A9BB2" }}>RECENT</div>
          {board.recent.map((c) => {
            const mine = c.participants.find((p) => p.id === board.me.id);
            return (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 12,
                  color: "#C9D5E4",
                  background: "rgba(0,0,0,0.5)",
                  borderRadius: 6,
                  padding: "8px 10px",
                }}
              >
                <Icon name={c.taskIcon} size={18} />
                <span style={{ flex: 1 }}>
                  {c.taskTitle}
                  {c.status === "rejected" && c.adminNote ? ` — "${c.adminNote}"` : ""}
                </span>
                <span style={{ color: c.status === "approved" ? "#70E090" : "#F0B060", fontWeight: 600 }}>
                  {c.status === "approved" ? `+${mine?.amount ?? 0} Creds` : "Try again"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
